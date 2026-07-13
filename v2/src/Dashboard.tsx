import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession, API_URL } from './lib/auth'
import { useLocation } from 'react-router-dom'
import { cache } from './lib/cache'
import { PetDashboardWidget } from './components/PetDashboardWidget'
import { getTextbookEmoji } from './lib/textbooks'
import { mistakeService, type Mistake } from './lib/mistakeService'
import { MistakeReviewer } from './components/MistakeReviewer'
import { useHorizontalScrollRef } from './hooks/useHorizontalScrollRef'
import { CustomTooltip } from './components/dashboard/DashboardShared'
import { BookSection } from './components/dashboard/BookSection'
import { LockdownOverlay } from './components/dashboard/LockdownOverlay'
import { TestdriveSelector } from './components/dashboard/TestdriveSelector'
import { ScrollDownHint } from './components/dashboard/ScrollDownHint'
import { QuickNav } from './components/dashboard/QuickNav'
import { MistakeBookView } from './components/dashboard/MistakeBookView'
import './Dashboard.css'
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TestSheetShell } from './components/TestSheetShell'
import { decryptContent, OBSCURE_KEY } from './lib/crypto'

export function Dashboard({ showChinese = false }: { showChinese?: boolean }) {
  const historyScrollRef = useHorizontalScrollRef()
  const { data: session } = useSession()
  const location = useLocation()
  const returnState = location.state as { textbook?: string; unit?: string; page?: string } | null
  const targetTextbook = returnState?.textbook || sessionStorage.getItem('last-active-textbook') || ''
  const targetUnit = returnState?.unit || sessionStorage.getItem('last-active-unit') || ''
  const targetPage = returnState?.page || sessionStorage.getItem('last-active-page') || ''

  const [practices, setPractices] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [activeTodayBook, setActiveTodayBook] = useState<string>('')
  const [historyOffset, setHistoryOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'textbooks' | 'mistakes'>('textbooks')
  
  const [selectedTestPractice, setSelectedTestPractice] = useState<any | null>(null)
  const [selectedAttemptForDetails, setSelectedAttemptForDetails] = useState<any | null>(null)
  const [activeTestFullContent, setActiveTestFullContent] = useState<any | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  const handleViewAttemptDetails = async (practice: any, attempt: any) => {
    setSelectedTestPractice(practice)
    setSelectedAttemptForDetails(attempt)
    if (practice) {
      setLoadingContent(true)
      try {
        const res = await fetch(`${API_URL}/api/practices/${practice.id}`, { credentials: 'include' })
        const json = await res.json()
        if (json && json.content) {
          let decrypted = json.content
          if (json.isEncrypted && typeof json.content === 'string') {
            decrypted = decryptContent(json.content, OBSCURE_KEY)
          }
          setActiveTestFullContent(decrypted)
        }
      } catch (e) {
        console.error("Failed to load full practice content:", e)
      } finally {
        setLoadingContent(false)
      }
    }
  }
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [activeMistakeReview, setActiveMistakeReview] = useState<Mistake[] | null>(null)
  const [isPreReview, setIsPreReview] = useState(false)
  const [activeMistakeBook, setActiveMistakeBook] = useState<string>('')
  const [activeMistakeUnit, setActiveMistakeUnit] = useState<string>('')
  const [showResolved, setShowResolved] = useState(false)
  const [showMistakeAlertModal, setShowMistakeAlertModal] = useState(false)
  const modalTimeoutRef = useRef<number | null>(null)

  const isTestdrive = (session?.user as any)?.role === 'testdrive'
  const [testdriveBook, setTestdriveBook] = useState<string>(() => sessionStorage.getItem('testdrive_selected_book') || '')
  const libraryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isTestdrive && testdriveBook && libraryRef.current) {
      setTimeout(() => {
        libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [testdriveBook, isTestdrive]);
  const [testdriveLockdown, setTestdriveLockdown] = useState<{ nextAvailableAt: string } | null>(null)

  const getThreshold3AM = () => {
    const d = new Date();
    if (d.getHours() < 3) {
      d.setDate(d.getDate() - 1);
    }
    d.setHours(3, 0, 0, 0);
    return d;
  };

  const listedMistakes = useMemo(() => {
    const threshold = getThreshold3AM();
    return mistakes.filter(m => {
      if (m.deleted) return false;
      if (!m.createdAt) return true;
      return new Date(m.createdAt) < threshold;
    });
  }, [mistakes]);

  const unlistedMistakes = useMemo(() => {
    const threshold = getThreshold3AM();
    return mistakes.filter(m => {
      if (m.deleted || m.resolved) return false;
      if (!m.createdAt) return false;
      
      const createdDate = new Date(m.createdAt);
      if (createdDate >= threshold) {
        return true;
      }
      
      if (m.updatedAt) {
        const updatedDate = new Date(m.updatedAt);
        if (updatedDate >= threshold) {
          return true;
        }
      }
      return false;
    });
  }, [mistakes]);

  const unlistedCount = unlistedMistakes.length;

  const unresolvedMistakes = useMemo(() => listedMistakes.filter(m => !m.resolved), [listedMistakes])
  const unresolvedCount = unresolvedMistakes.length

  useEffect(() => {
    if (unresolvedCount > 20) {
      setActiveView('mistakes')
    }
  }, [unresolvedCount])

  useEffect(() => {
    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current)
      }
    }
  }, [])

  const getDayLabel = (offset: number) => {
    if (offset === 0) return 'Today'
    if (offset === 1) return 'Yesterday'
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const fetchedUserIdRef = useRef<string | null>(null)
  const userId = session?.user?.id

  useEffect(() => {
    if (isTestdrive && session?.user?.username !== 'test0' && (session?.user as any)?.testdriveWindowStart) {
      const start = new Date((session?.user as any).testdriveWindowStart).getTime();
      const usageLimit = 20 * 60 * 1000;
      const cooldownPeriod = 1 * 60 * 60 * 1000;
      const nextAvailableAt = new Date(start + cooldownPeriod).toISOString();
      
      const checkExpiry = () => {
        const now = Date.now();
        if (now - start >= usageLimit) {
          setTestdriveLockdown({ nextAvailableAt });
        }
      };
      
      checkExpiry();
      const timer = setInterval(checkExpiry, 1000);
      return () => clearInterval(timer);
    }
  }, [isTestdrive, session?.user?.username, (session?.user as any)?.testdriveWindowStart]);

  useEffect(() => {
    if (userId && fetchedUserIdRef.current !== userId) {
      fetchedUserIdRef.current = userId

      const cachedPractices = cache.getPractices()
      if (cachedPractices) {
        setPractices(cachedPractices)
        setLoading(false)
      } else {
        setLoading(true)
      }
      fetch(API_URL + '/api/practices', { credentials: 'include' })
        .then(res => {
          if (res.status === 403) {
            return res.json().then(data => {
              if (data.reason === 'testdrive_expired' || data.reason === 'testdrive_daily_limit_reached') {
                setTestdriveLockdown({ nextAvailableAt: data.nextAvailableAt || '' });
              }
              throw new Error(data.error);
            });
          }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            cache.setPractices(data)
            setPractices(data)
          }
          setLoading(false)
        })
        .catch(e => {
          console.error(e)
          setLoading(false)
        })

      const cachedRecords = cache.getRecords()
      if (cachedRecords) {
        setRecords(cachedRecords.filter((r: any) => !r.unit.startsWith('game-')))
      }
      fetch(API_URL + '/api/records', { credentials: 'include' })
        .then(res => {
          if (res.status === 403) {
            return res.json().then(data => {
              if (data.reason === 'testdrive_expired' || data.reason === 'testdrive_daily_limit_reached') {
                setTestdriveLockdown({ nextAvailableAt: data.nextAvailableAt || '' });
              }
              throw new Error(data.error);
            });
          }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            cache.setRecords(data)
            setRecords(data.filter((r: any) => !r.unit.startsWith('game-')))
          }
        })
        .catch(console.error)

      // Load mistakes
      if ((session?.user as any)?.role !== 'testdrive') {
        mistakeService.syncFromServer(userId).then(synced => {
          setMistakes(synced)
        })
      } else {
        setMistakes(mistakeService.getMistakes(userId))
      }
    }
  }, [userId])

  useEffect(() => {
    const handleTriggerSync = () => {
      if (userId) {
        mistakeService.syncFromServer(userId).then(synced => {
          setMistakes(synced);
        });
      }
    };
    window.addEventListener('ep-trigger-sync', handleTriggerSync);
    return () => {
      window.removeEventListener('ep-trigger-sync', handleTriggerSync);
    };
  }, [userId]);

  useEffect(() => {
    if (!loading && targetTextbook) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`book-${targetTextbook}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sessionStorage.removeItem('last-active-textbook');
          sessionStorage.removeItem('last-active-unit');
          sessionStorage.removeItem('last-active-page');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, targetTextbook]);

  const handleCloseReviewer = () => {
    setActiveMistakeReview(null);
    setIsPreReview(false);
    if (userId) {
      setMistakes(mistakeService.getMistakes(userId));
    }
  };

  const handleDeleteMistake = (id: string) => {
    if (userId && window.confirm("Are you sure you want to delete this mistake?")) {
      mistakeService.removeMistake(userId, id);
      if ((session?.user as any)?.role !== 'testdrive') {
        mistakeService.syncToServer(userId);
      }
      setMistakes(mistakeService.getMistakes(userId));
    }
  };

  const groupedMistakes = useMemo(() => {
    const visibleMistakes = showResolved ? listedMistakes : listedMistakes.filter(m => !m.resolved);
    return visibleMistakes.reduce<Record<string, Record<string, Mistake[]>>>((acc, m) => {
      const tb = m.textbook || 'Other';
      const un = m.unit || 'General';
      if (!acc[tb]) acc[tb] = {};
      if (!acc[tb][un]) acc[tb][un] = [];
      acc[tb][un].push(m);
      return acc;
    }, {});
  }, [listedMistakes, showResolved]);

  // group: textbook -> unit -> practices[]
  const rawGrouped: Record<string, Record<string, any[]>> = practices.reduce((acc, p) => {
    // Skip C-GIU General unit or GENERAL textbook
    if ((p.textbook === 'C-GIU' && p.unit === 'General') || p.textbook === 'GENERAL') {
      return acc
    }
    // Filter for testdrive user
    if (isTestdrive && testdriveBook && p.textbook !== testdriveBook) {
      return acc
    }
    if (!acc[p.textbook]) acc[p.textbook] = {}
    if (!acc[p.textbook][p.unit]) acc[p.textbook][p.unit] = []
    acc[p.textbook][p.unit].push(p)
    return acc
  }, {})

  const grouped = useMemo(() => {
    if (isTestdrive && session?.user?.username === 'test0') {
      const filtered: Record<string, Record<string, any[]>> = {};
      Object.keys(rawGrouped).forEach(tb => {
        const units = Object.keys(rawGrouped[tb]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        if (units.length > 0) {
          const firstUnit = units[0];
          filtered[tb] = { [firstUnit]: rawGrouped[tb][firstUnit] };
        }
      });
      return filtered;
    }
    return rawGrouped;
  }, [rawGrouped, isTestdrive, session?.user?.username]);

  const getLast7DaysStats = (records: any[]) => {
    const stats = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayRecords = records.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= d && rDate < nextDay;
      });

      const count = dayRecords.length;
      const avgScore = count > 0
        ? Math.round(dayRecords.reduce((acc, r) => acc + (parseFloat(r.score) || 0), 0) / count)
        : 0;

      let totalTimeMs = 0;
      dayRecords.forEach(r => {
        const timeUsedMs = r.updatedAt ? new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() : 0;
        if (timeUsedMs > 0) {
          totalTimeMs += timeUsedMs;
        }
      });
      const totalDuration = Math.round(totalTimeMs / 60000);

      const bookCounts: Record<string, number> = {};
      dayRecords.forEach(r => {
        const match = r.unit.match(/^(.+?)\s\((.+)\)$/);
        let practiceId = r.unit;
        if (match) {
          practiceId = match[1];
        }
        let practice = practices.find(p => p.id === practiceId);
        if (!practice && practiceId.endsWith('-ad')) {
          const baseId = practiceId.slice(0, -3);
          const basePractice = practices.find(p => p.id === baseId);
          if (basePractice) {
            practice = {
              ...basePractice,
              id: practiceId,
              type: 'audio-detective',
              title: 'Audio Detective'
            };
          }
        }
        const book = practice ? practice.textbook : 'Unknown';
        bookCounts[book] = (bookCounts[book] || 0) + 1;
      });

      const breakdown = Object.entries(bookCounts)
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
        .map(([book, cnt]) => `${book}-${cnt}`)
        .join(', ');

      stats.push({
        date: dateStr,
        count,
        avgScore,
        breakdown,
        columnClickArea: 100,
        totalDuration
      });
    }
    return stats;
  };
  const last7DaysStats = useMemo(() => getLast7DaysStats(records), [records, practices]);

  if (!session) return (
    <div className="db-empty">Please sign in to view your dashboard.</div>
  )

  const handlePointClick = (...args: any[]) => {
    let data: any = null;
    let index: number = -1;
    if (args[0] && typeof args[0] === 'object' && 'date' in args[0]) {
      data = args[0];
    }
    if (typeof args[1] === 'number') {
      index = args[1];
    }
    if (index === -1 && data) {
      index = last7DaysStats.findIndex(s => s.date === data.date);
    }
    if (index >= 0 && index <= 6) {
      const offset = 6 - index;
      if (historyOffset !== offset) {
        setHistoryOffset(offset);
      }
    }
  };

  const handleChartInteraction = (state: any) => {
    if (!state) return;
    let index = state.activeTooltipIndex;
    if (typeof index !== 'number' && state.activeLabel) {
      index = last7DaysStats.findIndex(s => s.date === state.activeLabel);
    }
    if (typeof index === 'number' && index >= 0 && index <= 6) {
      const offset = 6 - index;
      if (historyOffset !== offset) {
        setHistoryOffset(offset);
      }
    }
  };

  const getTargetDateStr = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return d.toLocaleDateString()
  }
  const targetDateStr = getTargetDateStr(historyOffset);
  const parsedTodayRecords = records
    .filter(r => new Date(r.createdAt).toLocaleDateString() === targetDateStr)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(r => {
      const match = r.unit.match(/^(.+?)\s\((.+)\)$/);
      let practiceId = r.unit;
      let challengeTitle = '';
      if (match) {
        practiceId = match[1];
        challengeTitle = match[2];
      }
      let practice = practices.find(p => p.id === practiceId);
      if (!practice && practiceId.endsWith('-ad')) {
        const baseId = practiceId.slice(0, -3);
        const basePractice = practices.find(p => p.id === baseId);
        if (basePractice) {
          practice = {
            ...basePractice,
            id: practiceId,
            type: 'audio-detective',
            title: 'Audio Detective'
          };
        }
      }
      const timeStarted = new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const timeUsedMs = r.updatedAt ? new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() : 0;
      const timeUsed = timeUsedMs > 0 ? (timeUsedMs < 60000 ? '<1 min' : Math.round(timeUsedMs / 60000) + ' mins') : '-';

      let practiceName = 'Unknown';
      if (practice) {
        const acronym = practice.type.split('-').map((w: string) => w.charAt(0).toUpperCase()).join('');
        const shortChallenge = challengeTitle.replace('Challenge ', '').split(':')[0].trim();
        practiceName = challengeTitle ? `${acronym}-${shortChallenge}` : acronym;
      }

      return {
        id: r.id,
        timeStarted,
        bookUnit: practice ? `${practice.textbook}-${practice.unit}` : 'Unknown',
        book: practice ? practice.textbook : 'Unknown',
        practiceName,
        score: r.score + '%',
        timeUsed,
        rawRecord: r,
        practice
      };
    });

  const todayRecordsByBook = parsedTodayRecords.reduce<Record<string, typeof parsedTodayRecords>>((acc, r) => {
    const book = r.book || 'Unknown';
    if (!acc[book]) acc[book] = [];
    acc[book].push(r);
    return acc;
  }, {});

  const lastDoneBook = useMemo(() => {
    if (!records || records.length === 0 || !practices || practices.length === 0) return '';
    const sorted = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const r of sorted) {
      const match = r.unit.match(/^(.+?)\s\((.+)\)$/);
      let practiceId = r.unit;
      if (match) {
        practiceId = match[1];
      }
      if (practiceId.endsWith('-ad')) {
        practiceId = practiceId.slice(0, -3);
      }
      const p = practices.find(item => item.id === practiceId);
      if (p) {
        return p.textbook;
      }
    }
    return '';
  }, [records, practices]);

  const sortedTextbooks = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [grouped]);

  const defaultOpenBook = useMemo(() => {
    if (targetTextbook && sortedTextbooks.includes(targetTextbook)) {
      return targetTextbook;
    }
    if (lastDoneBook && sortedTextbooks.includes(lastDoneBook)) {
      return lastDoneBook;
    }
    return sortedTextbooks[0] || '';
  }, [targetTextbook, lastDoneBook, sortedTextbooks]);

  const todayBookKeys = Object.keys(todayRecordsByBook).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const activeBook = todayBookKeys.includes(activeTodayBook) ? activeTodayBook : (todayBookKeys[0] || '');

  return (
    <div className="db-root">
      <ScrollDownHint />
      {isTestdrive && !testdriveBook && !loading && !testdriveLockdown && (
        <TestdriveSelector 
          username={session?.user?.username || undefined}
          books={practices.reduce((acc, p) => {
            if ((p.textbook === 'C-GIU' && p.unit === 'General') || p.textbook === 'GENERAL') return acc;
            if (!acc[p.textbook]) acc[p.textbook] = {};
            if (!acc[p.textbook][p.unit]) acc[p.textbook][p.unit] = true;
            return acc;
          }, {} as Record<string, any>)} 
          onSelect={(tb) => {
            setTestdriveBook(tb);
            sessionStorage.setItem('testdrive_selected_book', tb);
          }}
          showChinese={showChinese}
        />
      )}

      {isTestdrive && testdriveLockdown && (
        <LockdownOverlay 
          nextAvailableAt={testdriveLockdown.nextAvailableAt} 
          showChinese={showChinese} 
        />
      )}

      <div className="db-hero">
        <span className="db-wave">👋</span>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="db-title">Hi, {session.user.name}!</h2>
            <p className="db-subtitle">
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  Welcome back to <span className="brand-highlight">TextbookPass</span>
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  欢迎回到<span className="brand-highlight">同步派</span>
                </span>
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="db-books db-top-section">
        <div className="db-pet-widget-wrapper">
          <PetDashboardWidget showChinese={showChinese} />
        </div>
        <div className="db-top-right">
        <div className="db-stats">
          <h3 className="db-stats-title">
            <span className="db-title-grid">
              <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                Activity: Last 7 Days
              </span>
              <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                最近7天活动
              </span>
            </span>
          </h3>
          <div className="db-chart-card">
            <div className="db-chart-legend-left">
              <span className="db-chart-legend-bar" />
              <span className="db-chart-legend-bar" style={{ backgroundColor: '#e67e22', marginTop: '4px' }} />
              <span>Practices & Time (m)</span>
            </div>
            <div className="db-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={last7DaysStats}
                  margin={{ top: 16, right: 12, bottom: 0, left: -8 }}
                  onClick={handleChartInteraction}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--tab-active-text)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--tab-active-text)" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="durationBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e67e22" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#e67e22" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="date" stroke="var(--text)" fontSize={11}
                    tickLine={false} axisLine={false} dy={6}
                    tickFormatter={(value, index) => [1, 3, 5].includes(index) ? '' : value}
                  />
                  <XAxis
                    xAxisId="hidden"
                    dataKey="date"
                    hide
                  />
                  <YAxis
                    yAxisId="left" stroke="var(--text)" fontSize={11}
                    tickLine={false} axisLine={false} tickCount={5}
                    allowDecimals={false} width={28}
                  />
                  <YAxis
                    yAxisId="right" orientation="right" stroke="var(--text)"
                    fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}%`} domain={[0, 100]} width={36}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--accent-bg)', radius: 4 }}
                    content={<CustomTooltip />}
                  />
                  <Area
                    yAxisId="right" type="monotone" dataKey="avgScore"
                    fill="url(#lineGlow)" stroke="none" tooltipType="none"
                  />
                  <Bar
                    yAxisId="left" dataKey="count" name="Practices Done"
                    fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={10}
                  />
                  <Bar
                    yAxisId="left" dataKey="totalDuration" name="Time Used"
                    fill="url(#durationBarGrad)" radius={[4, 4, 0, 0]} barSize={10}
                  />
                  <Line
                    yAxisId="right" type="monotone" dataKey="avgScore"
                    name="Avg Score" stroke="var(--accent)" strokeWidth={2.5}
                    dot={{ r: 3.5, fill: 'var(--card-bg)', strokeWidth: 2.5 }}
                    activeDot={{ r: 5.5, fill: 'var(--accent)', strokeWidth: 0 }}
                  />
                  <Bar
                    xAxisId="hidden"
                    yAxisId="right" dataKey="columnClickArea"
                    fill="transparent" barSize={40}
                    onClick={handlePointClick}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="db-chart-legend-right">
              <span className="db-chart-legend-dot" />
              <span>Avg Score</span>
            </div>
          </div>
        </div>

        <div className="db-stats db-stats-history">
          <div className="db-history-header">
            <h3 className="db-stats-title">
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  Practice History
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  练习历史
                </span>
              </span>
            </h3>
            <div className="db-history-nav">
              <button
                onClick={() => setHistoryOffset(prev => Math.min(6, prev + 1))}
                disabled={historyOffset === 6}
                className="db-history-nav-btn"
                title="Previous Day"
              >
                ←
              </button>
              <span className="db-history-nav-label">
                {getDayLabel(historyOffset)}
              </span>
              <button
                onClick={() => setHistoryOffset(prev => Math.max(0, prev - 1))}
                disabled={historyOffset === 0}
                className="db-history-nav-btn"
                title="Next Day"
              >
                →
              </button>
            </div>
          </div>
          {parsedTodayRecords.length > 0 ? (
            <div className="db-history-content">
              <div className="db-units-tabs" ref={historyScrollRef}>
                {todayBookKeys.map(book => (
                  <button
                    key={book}
                    onClick={() => setActiveTodayBook(book)}
                    className={`db-tab-btn ${activeBook === book ? 'active' : ''}`}
                  >
                    <span>{getTextbookEmoji(book)}</span>
                    <span>{book} ({todayRecordsByBook[book].length})</span>
                  </button>
                ))}
              </div>
              <div className="db-stats-table-container">
                <table className="db-stats-table">
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th>Book-Unit</th>
                      <th>Practice</th>
                      <th>Score</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(todayRecordsByBook[activeBook] || []).map(r => {
                      const isTest = r.practice && (r.practice.type.toLowerCase().includes('test') || r.rawRecord.unit.includes('(Test Sheet)'));
                      return (
                        <tr 
                          key={r.id}
                          onClick={() => {
                            if (isTest) {
                              handleViewAttemptDetails(r.practice, r.rawRecord);
                            }
                          }}
                          style={{ cursor: isTest ? 'pointer' : 'default' }}
                          title={isTest ? (showChinese ? '点击查看测试详情' : 'Click to view test details') : undefined}
                        >
                          <td>{r.timeStarted}</td>
                          <td>{r.bookUnit}</td>
                          <td>{r.practiceName}</td>
                          <td>{r.score}</td>
                          <td>{r.timeUsed}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="db-empty" style={{ padding: '20px' }}>
              No practices started {historyOffset === 0 ? 'today' : historyOffset === 1 ? 'yesterday' : `on ${getDayLabel(historyOffset)}`} yet.
            </div>
          )}
        </div>
      </div>
    </div>

      {loading ? (
        <div className="db-empty">Loading textbooks...</div>
      ) : isTestdrive && !testdriveBook ? (
        <div className="db-empty">Please select a textbook to begin.</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="db-empty">No textbooks assigned. Please contact your administrator.</div>
      ) : (
        <>
          <div className="db-view-tabs" ref={libraryRef}>
            <button
              className={`db-view-tab ${activeView === 'textbooks' ? 'active' : ''} ${unresolvedCount > 20 ? 'disabled' : ''}`}
              onClick={() => {
                if (unresolvedCount > 20) {
                  if (modalTimeoutRef.current) {
                    clearTimeout(modalTimeoutRef.current);
                  }
                  setShowMistakeAlertModal(true);
                  modalTimeoutRef.current = window.setTimeout(() => {
                    setShowMistakeAlertModal(false);
                  }, 5000);
                } else {
                  setActiveView('textbooks');
                }
              }}
            >
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  🎯 Practice Library
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  🎯 练习库
                </span>
              </span>
            </button>
            <button
              className={`db-view-tab ${activeView === 'mistakes' ? 'active' : ''}`}
              onClick={() => setActiveView('mistakes')}
            >
              <span className="db-title-grid">
                <span className={showChinese ? "anim-fade-out" : "anim-fade-in"} key={showChinese ? "en-out" : "en-in"}>
                  📓 Mistake Book
                </span>
                <span className={showChinese ? "anim-fade-in" : "anim-fade-out"} key={showChinese ? "cn-in" : "cn-out"}>
                  📓 错题本
                </span>
              </span>
              {(unresolvedCount > 0 || unlistedCount > 0) && (
                <span className="db-view-tab-badge">
                  {unresolvedCount}{unlistedCount > 0 ? `+${unlistedCount}` : ''}
                </span>
              )}
            </button>
          </div>

          {activeView === 'textbooks' ? (
            <div className="db-books">
              {Object.keys(grouped).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(tb => (
                <BookSection
                  key={tb}
                  tb={tb}
                  units={grouped[tb]}
                  records={records}
                  initialUnit={targetTextbook === tb ? targetUnit : undefined}
                  initialPage={targetTextbook === tb ? targetPage : undefined}
                  showChinese={showChinese}
                  isTestdrive={isTestdrive}
                  initiallyOpen={tb === defaultOpenBook}
                  onResetTestdrive={() => {
                    setTestdriveBook('');
                    sessionStorage.removeItem('testdrive_selected_book');
                  }}
                />
              ))}
            </div>
          ) : (
            <MistakeBookView
              mistakes={mistakes}
              showChinese={showChinese}
              unresolvedCount={unresolvedCount}
              unlistedCount={unlistedCount}
              showResolved={showResolved}
              setShowResolved={setShowResolved}
              activeMistakeBook={activeMistakeBook}
              setActiveMistakeBook={setActiveMistakeBook}
              activeMistakeUnit={activeMistakeUnit}
              setActiveMistakeUnit={setActiveMistakeUnit}
              groupedMistakes={groupedMistakes}
              unresolvedMistakes={unresolvedMistakes}
              setActiveMistakeReview={setActiveMistakeReview}
              handleDeleteMistake={handleDeleteMistake}
              handleStartPreReview={() => {
                setActiveMistakeReview(unlistedMistakes);
                setIsPreReview(true);
              }}
            />
          )}
        </>
      )}

      {activeMistakeReview && (
        <MistakeReviewer
          userId={userId || ''}
          initialMistakes={activeMistakeReview}
          onClose={handleCloseReviewer}
          isPreReview={isPreReview}
        />
      )}

      {showMistakeAlertModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}
        onClick={() => setShowMistakeAlertModal(false)}
        >
          <div style={{
            background: 'var(--card-bg, #1a1b26)',
            borderRadius: '16px',
            border: '1px solid var(--accent, #aa3bff)',
            width: '100%',
            maxWidth: '400px',
            padding: '30px',
            boxSizing: 'border-box',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(170, 59, 255, 0.25)',
            color: 'var(--text-h, #fff)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: 'var(--accent, #aa3bff)', fontWeight: 'bold' }}>
              {showChinese ? '错题太多啦！' : 'Too many mistakes to review!'}
            </h3>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {showChinese 
                ? '你的错题本里有超过 20 道错题。请先消灭错题，使其少于 20 道，才能解锁练习库！' 
                : 'You have more than 20 items in your Mistake Book. Please resolve them to less than 20 to unlock the Practice Library!'}
            </p>
            <p style={{ margin: '16px 0 0 0', color: 'var(--text-m, #888)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              {showChinese ? '(此窗口将在 5 秒后自动关闭)' : '(This window will close automatically in 5 seconds)'}
            </p>
          </div>
        </div>
      )}
      
      {selectedAttemptForDetails && selectedTestPractice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'var(--bg)',
          zIndex: 10000,
          overflowY: 'auto'
        }}>
          {loadingContent ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-h)' }}>
              <div style={{ width: '32px', height: '32px', border: '4px solid var(--border)', borderTopColor: 'var(--tab-active-text)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
              <div>{showChinese ? '正在加载测试内容...' : 'Loading test content...'}</div>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : activeTestFullContent ? (
            <TestSheetShell 
              data={activeTestFullContent}
              practiceId={selectedTestPractice.id}
              unit={selectedTestPractice.unit}
              textbook={selectedTestPractice.textbook}
              initialAnswers={selectedAttemptForDetails.answers || {}}
              initialSubmitted={true}
              initialScore={selectedAttemptForDetails.score}
              onCloseReadOnly={() => {
                setSelectedAttemptForDetails(null);
                setActiveTestFullContent(null);
              }}
            />
          ) : null}
        </div>
      )}
      <QuickNav showChinese={showChinese} />
    </div>
  )
}
