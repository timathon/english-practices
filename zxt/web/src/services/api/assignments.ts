import { API_BASE_URL, USE_BACKEND, getAuthHeaders } from './config';
import { authService } from './auth';
import { enqueueSyncTask } from '../syncQueue';

export const assignmentsService = {
  async getAssignments(className: string = '三年级A班'): Promise<any[]> {
    const studentUser = authService.getSession();
    const studentId = studentUser?.id || 'usr_stu_001';
    const completedKey = `zxt_completed_asgns_${studentId}`;
    const completedStored = localStorage.getItem(completedKey);
    const completedIds: string[] = completedStored ? JSON.parse(completedStored) : [];

    let rawAssignments: any[] = [];

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assignments?className=${encodeURIComponent(className)}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.assignments && Array.isArray(data.assignments)) {
            rawAssignments = data.assignments;
            localStorage.setItem('zxt_assignments', JSON.stringify(data.assignments));
          }
        }
      } catch (err) {
        console.warn('Backend assignments fetch failed, falling back to cache:', err);
      }
    }

    if (rawAssignments.length === 0) {
      const stored = localStorage.getItem('zxt_assignments');
      if (!stored || stored.includes('asgn_01') || stored.includes('asgn_02')) {
        localStorage.setItem('zxt_assignments', JSON.stringify([]));
        return [];
      }
      const all = JSON.parse(stored);
      rawAssignments = all.filter((a: any) => a.className === className);
    }

    return rawAssignments.map((a: any) => {
      const isDone = a.status === '已打卡' || completedIds.includes(a.id);
      return isDone ? { ...a, status: '已打卡' } : a;
    });
  },

  async createAssignment(assignment: {
    className: string;
    poemId: number;
    poemTitle: string;
    startDate?: string;
    dueDate: string;
    requirement: string;
    questionIds?: string[];
    createdTeacherId?: string;
  }) {
    const user = authService.getSession();
    let createdAsgn = {
      id: `asgn_${Date.now()}`,
      classId: 'c1',
      className: assignment.className,
      poemId: assignment.poemId,
      poemTitle: assignment.poemTitle,
      startDate: assignment.startDate || new Date().toISOString(),
      dueDate: assignment.dueDate,
      status: '待完成',
      requirement: assignment.requirement,
      questionIds: assignment.questionIds || [],
      createdTeacherId: assignment.createdTeacherId || user?.id || 'usr_tea_001',
      isWithdrawn: false,
    };

    if (USE_BACKEND) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assignments`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(createdAsgn)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.assignment) {
            createdAsgn = data.assignment;
          }
        }
      } catch (err) {
        console.warn('Failed to create assignment on backend:', err);
      }
    }

    const stored = localStorage.getItem('zxt_assignments');
    const all: any[] = (stored && !stored.includes('asgn_01') && !stored.includes('asgn_02')) ? JSON.parse(stored) : [];
    const idx = all.findIndex((a: any) => a.id === createdAsgn.id);
    if (idx !== -1) {
      all[idx] = createdAsgn;
    } else {
      all.push(createdAsgn);
    }
    localStorage.setItem('zxt_assignments', JSON.stringify(all));

    return createdAsgn;
  },

  async markAssignmentCompletedBackend(asgnId: string, score: number = 100) {
    if (!USE_BACKEND) return true;
    const res = await fetch(`${API_BASE_URL}/api/assignments/${asgnId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: '已打卡', score })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return true;
  },

  async markAssignmentCompleted(asgnId: string, score: number = 100) {
    const studentUser = authService.getSession();
    const studentId = studentUser?.id || 'usr_stu_001';
    const completedKey = `zxt_completed_asgns_${studentId}`;
    const completedStored = localStorage.getItem(completedKey);
    const completedIds: string[] = completedStored ? JSON.parse(completedStored) : [];
    if (!completedIds.includes(asgnId)) {
      completedIds.push(asgnId);
      localStorage.setItem(completedKey, JSON.stringify(completedIds));
    }

    const stored = localStorage.getItem('zxt_assignments');
    if (stored) {
      try {
        const all = JSON.parse(stored);
        const updated = all.map((a: any) => a.id === asgnId ? { ...a, status: '已打卡', score } : a);
        localStorage.setItem('zxt_assignments', JSON.stringify(updated));
      } catch (_) {}
    }

    if (USE_BACKEND) {
      this.markAssignmentCompletedBackend(asgnId, score).catch((err) => {
        console.warn('Backend assignment update failed, queuing for background retry:', err);
        enqueueSyncTask('MARK_ASSIGNMENT_COMPLETED', { asgnId, score });
      });
    }
  }
};
