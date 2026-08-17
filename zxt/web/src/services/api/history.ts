import { API_BASE_URL, USE_BACKEND, getAuthHeaders } from './config';
import { authService, setCurrentSession } from './auth';
import { idbService } from '../db';
import { enqueueSyncTask } from '../syncQueue';

const historyFetchThrottleMap: Record<string, number> = {};

export function clearHistoryFetchThrottle(studentId?: string) {
  if (studentId) {
    delete historyFetchThrottleMap[studentId];
  } else {
    Object.keys(historyFetchThrottleMap).forEach(k => delete historyFetchThrottleMap[k]);
  }
}

export function calculateTotalPoints(history: any[] = []): number {
  const practicePoints = (history || []).reduce((sum: number, item: any, idx: number) => {
    const numS = Number(item.score) || 0;
    const priorAttempts = history.slice(idx + 1).filter((h: any) => h.poemTitle ? h.poemTitle === item.poemTitle : h.poemId === item.poemId);
    const isFirst = idx === history.length - 1 || priorAttempts.length === 0;

    let priorHighestScore = 0;
    for (const p of priorAttempts) {
      const pScore = Number(p.score) || 0;
      if (pScore > priorHighestScore) priorHighestScore = pScore;
    }
    const itemDateStr = item.completedAt ? item.completedAt.split(' ')[0] : '';
    const hasSameDayPriorAttempt = priorAttempts.some((p: any) => p.completedAt && p.completedAt.split(' ')[0] === itemDateStr);

    const base = !hasSameDayPriorAttempt ? 5 : 0;
    const timely = isFirst ? 10 : 0;
    const getAccTier = (a: number) => (a >= 100 ? 25 : a >= 90 ? 20 : a >= 80 ? 15 : a >= 70 ? 5 : 0);
    const acc = Math.max(0, getAccTier(numS) - (priorAttempts.length > 0 ? getAccTier(priorHighestScore) : 0));

    return sum + base + timely + acc;
  }, 0);

  // Subtract points spent on gem exchanges
  const gemsHistory = getGemsHistorySync();
  const totalExchangedPoints = gemsHistory.reduce((sum, h) => sum + (h.pointsDeducted || 0), 0);

  return Math.max(0, practicePoints - totalExchangedPoints);
}

export function getGemsHistorySync(studentId: string = 'usr_stu_001'): any[] {
  const stored = localStorage.getItem(`zxt_gems_history_${studentId}`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (_) {
    return [];
  }
}

export function getGemsSync(studentId: string = 'usr_stu_001'): number {
  const gemsHistory = getGemsHistorySync(studentId);
  return gemsHistory.reduce((sum, h) => sum + (h.gemsChanged || 0), 0);
}

export function exchangePointsForGems(studentId: string, pointsToExchange: number): { success: boolean; gemsEarned: number; newPoints: number; newGems: number; error?: string } {
  if (pointsToExchange <= 0 || pointsToExchange % 100 !== 0) {
    return { success: false, gemsEarned: 0, newPoints: 0, newGems: 0, error: '兑换智慧点必须为 100 的整数倍！' };
  }

  const history = historyService.getQuizHistorySync(studentId);
  const currentPoints = calculateTotalPoints(history);

  if (currentPoints < pointsToExchange) {
    return { success: false, gemsEarned: 0, newPoints: currentPoints, newGems: getGemsSync(studentId), error: `智慧点不足！当前仅有 ${currentPoints} 智慧点。` };
  }

  const gemsEarned = pointsToExchange / 100;
  const currentGems = getGemsSync(studentId);
  const newGems = currentGems + gemsEarned;
  const newPoints = currentPoints - pointsToExchange;

  const gemsHistory = getGemsHistorySync(studentId);
  const record = {
    id: `gh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'exchange',
    pointsDeducted: pointsToExchange,
    gemsChanged: gemsEarned,
    gemsBalance: newGems,
    pointsBalance: newPoints,
    description: `消耗 ${pointsToExchange} 智慧点 兑换 +${gemsEarned} 知新星石`,
    timestamp: new Date().toLocaleString('zh-CN', { hour12: false })
  };

  gemsHistory.unshift(record);
  localStorage.setItem(`zxt_gems_history_${studentId}`, JSON.stringify(gemsHistory));

  const activeUser = authService.getSession();
  if (activeUser) {
    activeUser.points = newPoints;
    activeUser.gems = newGems;
    setCurrentSession(activeUser);
    window.dispatchEvent(new Event('zxt_user_updated'));
  }

  return { success: true, gemsEarned, newPoints, newGems };
}

export const historyService = {
  async recordQuizResultBackend(studentId: string, result: any, recordId?: string) {
    if (!USE_BACKEND) return null;
    const res = await fetch(`${API_BASE_URL}/api/student/history`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        studentId,
        recordId: recordId || result.recordId || `qh_${Date.now()}`,
        ...result,
      }),
    });
    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errDetail = errJson.error;
        }
      } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${errDetail}`);
    }
    const data = await res.json();
    return data;
  },

  async getQuizHistory(
    studentId: string = 'usr_stu_001',
    onRemoteUpdate?: (updatedHistory: any[]) => void,
    forceRefresh: boolean = false
  ): Promise<any[]> {
    let cachedList = await idbService.getHistoryList(studentId);
    const stored = localStorage.getItem(`zxt_qh_${studentId}`);
    if (stored) {
      try {
        const localList = JSON.parse(stored);
        if (Array.isArray(localList) && (!cachedList || localList.length >= cachedList.length)) {
          cachedList = localList;
        }
      } catch (_) {}
    }

    const defaultHistory = [
      { id: 'qh_001', poemTitle: '池上', poemId: 1, score: 50, accuracy: '50%', quizType: '班级作业闯关', completedAt: '2026/7/27 21:14:16', totalQuestions: 4, mistakeCount: 2 }
    ];

    const initialList = (cachedList && cachedList.length > 0) ? cachedList : defaultHistory;

    const now = Date.now();
    const lastFetch = historyFetchThrottleMap[studentId] || 0;
    const isThrottled = !forceRefresh && (now - lastFetch < 60000);

    if (USE_BACKEND && !isThrottled) {
      historyFetchThrottleMap[studentId] = now;
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/student/history?studentId=${encodeURIComponent(studentId)}`, {
            headers: getAuthHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.history && Array.isArray(data.history)) {
              await idbService.saveHistoryList(studentId, data.history);
              localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(data.history));
              if (onRemoteUpdate) {
                onRemoteUpdate(data.history);
              }
            }
          }
        } catch (err) {
          console.warn('Backend quiz history fetch failed:', err);
        }
      })();
    }

    return initialList;
  },

  async getQuizHistoryDetail(id: string): Promise<any | null> {
    if (!id) return null;

    const cached = await idbService.getHistoryDetail(id);
    if (cached && cached.details && Array.isArray(cached.details) && cached.details.length > 0) {
      return cached;
    }

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/history/${encodeURIComponent(id)}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            await idbService.saveHistoryDetail(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('Backend history detail fetch failed:', err);
      }
    }

    return cached || null;
  },

  getQuizHistorySync(studentId: string = 'usr_stu_001') {
    const defaultHistory = [
      { id: 'qh_001', poemTitle: '池上', poemId: 1, score: 50, accuracy: '50%', quizType: '班级作业闯关', completedAt: '2026/7/27 21:14:16' }
    ];
    const stored = localStorage.getItem(`zxt_qh_${studentId}`);
    if (!stored) {
      return defaultHistory;
    }
    try {
      return JSON.parse(stored);
    } catch (_) {
      return defaultHistory;
    }
  },

  recordQuizResult(studentId: string, result: { poemTitle: string; poemId: number; score: number; accuracy: string; quizType: string; details?: any[]; assignmentId?: string }) {
    const history = this.getQuizHistorySync(studentId);
    const recordId = (result as any).id || `qh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawDetails = result.details || [];
    const questionsList: any[] = Array.isArray(rawDetails)
      ? rawDetails
      : (rawDetails && typeof rawDetails === 'object' && Array.isArray((rawDetails as any).questions)
          ? (rawDetails as any).questions
          : (rawDetails && typeof rawDetails === 'object' ? Object.values(rawDetails).filter(v => v && typeof v === 'object' && ('isCorrect' in (v as any) || 'questionId' in (v as any))) : []));

    const totalQs = (result as any).totalQuestions !== undefined ? (result as any).totalQuestions : questionsList.length;
    const mistakeCnt = (result as any).mistakeCount !== undefined ? (result as any).mistakeCount : questionsList.filter((q: any) => q && q.isCorrect === false).length;

    const newRecord = {
      id: recordId,
      ...result,
      totalQuestions: totalQs,
      mistakeCount: mistakeCnt,
      completedAt: new Date().toLocaleString('zh-CN', { hour12: false })
    };

    clearHistoryFetchThrottle(studentId);

    const existingIndex = history.findIndex((h: any) => h.id === recordId);
    if (existingIndex !== -1) {
      history[existingIndex] = newRecord;
    } else {
      history.unshift(newRecord);
    }
    history.sort((a: any, b: any) => {
      const timeA = new Date(a.completedAt?.replace(/\//g, '-') || 0).getTime();
      const timeB = new Date(b.completedAt?.replace(/\//g, '-') || 0).getTime();
      return timeB - timeA;
    });
    localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(history));

    const numScore = Number(result.score) || 0;
    const targetPoemId = result.poemId;
    const priorAttempts = history.slice(1).filter((h: any) => h.poemTitle ? h.poemTitle === result.poemTitle : h.poemId === targetPoemId);
    const isFirstAttempt = priorAttempts.length === 0;

    let priorHighestScore = 0;
    for (const p of priorAttempts) {
      const pScore = Number(p.score) || 0;
      if (pScore > priorHighestScore) priorHighestScore = pScore;
    }

    const getAccTier = (a: number) => (a >= 100 ? 25 : a >= 90 ? 20 : a >= 80 ? 15 : a >= 70 ? 5 : 0);
    const accuracyBonus = Math.max(0, getAccTier(numScore) - getAccTier(priorHighestScore));
    const itemDateStr = newRecord.completedAt.split(' ')[0];
    const hasSameDayPriorAttempt = priorAttempts.some((p: any) => p.completedAt && p.completedAt.split(' ')[0] === itemDateStr);
    const basePts = !hasSameDayPriorAttempt ? 5 : 0;
    const timelyPts = isFirstAttempt ? 10 : 0;
    const total = basePts + timelyPts + accuracyBonus;

    const totalCumulativePoints = calculateTotalPoints(history);

    const activeUser = authService.getSession();
    if (activeUser) {
      activeUser.points = totalCumulativePoints;
      setCurrentSession(activeUser);
      window.dispatchEvent(new Event('zxt_user_updated'));
    }

    const pointBreakdown = {
      basePoints: basePts,
      timelyBonus: timelyPts,
      accuracyBonus,
      totalEarnedPoints: total,
      newTotalPoints: totalCumulativePoints,
      isLockedToday: numScore >= 100,
      isFirstAttempt,
      historicalHighestScore: Math.max(priorHighestScore, numScore)
    };

    (newRecord as any).pointBreakdown = pointBreakdown;
    localStorage.setItem(`zxt_qh_${studentId}`, JSON.stringify(history));

    idbService.saveHistoryDetail(newRecord);
    const conciseHistory = history.map(({ details, ...rest }: any) => rest);
    idbService.saveHistoryList(studentId, conciseHistory);

    if (USE_BACKEND) {
      const payloadWithId = { ...result, recordId, pointBreakdown };
      this.recordQuizResultBackend(studentId, payloadWithId, recordId)
        .then((data) => {
          if (data) {
            const mergedRecord = { ...newRecord, ...data };
            idbService.saveHistoryDetail(mergedRecord);
          }
          if (data && data.pointBreakdown && data.pointBreakdown.newTotalPoints !== undefined) {
            const user = authService.getSession();
            if (user) {
              user.points = data.pointBreakdown.newTotalPoints;
              setCurrentSession(user);
            }
          }
        })
        .catch((err) => {
          console.warn('Backend quiz history sync failed, queuing task:', err);
          enqueueSyncTask('RECORD_QUIZ_RESULT', { studentId, result: payloadWithId });
        });
    }

    return pointBreakdown;
  }
};
