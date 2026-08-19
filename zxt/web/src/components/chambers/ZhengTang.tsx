import React, { useState } from 'react';
import { PoemQuestion, IdiomQuestion } from '../../services/api';

interface ZhengTangProps {
  user: any;
  assignments: any[];
  quizHistory?: any[];
  onStartQuiz: (title: string, questions: (PoemQuestion | IdiomQuestion)[], assignmentId?: string) => void;
}

export const ZhengTang: React.FC<ZhengTangProps> = ({
  user,
  assignments,
  quizHistory = [],
  onStartQuiz,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'chinese' | 'math' | 'english'>('all');

  const todayStr = new Date().toLocaleDateString('zh-CN');

  // Helper to compute today's attempts used for a specific assignment
  const getTodayAttemptsUsed = (asgn: any): number => {
    return (quizHistory || []).filter((h: any) => {
      if (!h || !h.completedAt) return false;
      const hDateStr = new Date(h.completedAt.replace(/\//g, '-')).toLocaleDateString('zh-CN');
      if (hDateStr !== todayStr) return false;

      if (asgn.id && h.assignmentId) {
        return h.assignmentId === asgn.id;
      }
      return h.poemTitle === asgn.poemTitle;
    }).length;
  };

  const getSubjectSampleQuestions = (subject: string): { title: string; questions: PoemQuestion[] } => {
    if (subject === 'chinese_pinyin') {
      return {
        title: '语文 · 拼音专项练习',
        questions: [
          { id: 'cn_py_1', type: 'VerseCloze', prompt: '请选择"水波"中"波"字正确的声调与拼音：', options: ['bō', 'bó', 'bǒ', 'bò'], answer: 0, explanation: '波 (bō) 第一声，组词：水波、波浪。' },
          { id: 'cn_py_2', type: 'VerseCloze', prompt: '"光明"的"明"字拼音是：', options: ['míng', 'mín', 'míngg', 'míngn'], answer: 0, explanation: '明 (míng) 后鼻音。' }
        ]
      };
    } else if (subject === 'chinese_chengyu') {
      return {
        title: '语文 · 成语典故练习',
        questions: [
          { id: 'cn_cy_1', type: 'VerseCloze', prompt: '请补全成语：温故而____', options: ['知新', '知旧', '知足', '知心'], answer: 0, explanation: '温故而知新，出自《论语》。' },
          { id: 'cn_cy_2', type: 'VerseCloze', prompt: '形容学习刻苦，读书不知疲倦的成语是：', options: ['手不释卷', '走马观花', '囫囵吞枣', '浅尝辄止'], answer: 0, explanation: '手不释卷：书本不离手。' }
        ]
      };
    } else if (subject === 'math') {
      return {
        title: '数学 · 基础算术与思维开发',
        questions: [
          { id: 'math_1', type: 'VerseCloze', prompt: '计算：25 × 4 + 35 = ?', options: ['135', '125', '145', '115'], answer: 0, explanation: '25 × 4 = 100，100 + 35 = 135。' },
          { id: 'math_2', type: 'VerseCloze', prompt: '一个正方形的边长是 6 厘米，它的周长是：', options: ['24 厘米', '36 厘米', '12 厘米', '18 厘米'], answer: 0, explanation: '正方形周长 = 边长 × 4 = 6 × 4 = 24 厘米。' }
        ]
      };
    } else if (subject === 'english') {
      return {
        title: '英语 · 词汇与常用句型',
        questions: [
          { id: 'en_1', type: 'VerseCloze', prompt: 'Choose the correct word: "She ____ to school every morning."', options: ['walks', 'walked', 'walking', 'walk'], answer: 0, explanation: 'Third person singular simple present tense: walks.' },
          { id: 'en_2', type: 'VerseCloze', prompt: 'What is the synonym of "Happy"?', options: ['Joyful', 'Sad', 'Angry', 'Tired'], answer: 0, explanation: 'Joyful means full of happiness.' }
        ]
      };
    }
    return {
      title: '语文 · 识字与笔顺强化',
      questions: [
        { id: 'cn_sz_1', type: 'VerseCloze', prompt: '"静夜思"中"静"字的偏旁部首是：', options: ['青', '争', '立', '月'], answer: 0, explanation: '静为左右结构，部首为"青"。' }
      ]
    };
  };

  const pendingAssignments = assignments.filter(a => a.status !== '已打卡');
  const doneAssignments = assignments.filter(a => a.status === '已打卡');

  const tabs = [
    { id: 'all',     label: '全部锦囊',     emoji: '📚', count: pendingAssignments.length },
    { id: 'chinese', label: '语文',         emoji: '📖' },
    { id: 'math',    label: '数学',         emoji: '📐' },
    { id: 'english', label: '英语',         emoji: '🔤' },
  ] as const;

  const questModules = [
    {
      key: 'chinese_pinyin',
      emoji: '🔤', label: '语文 · 拼音专项', sub: '声调辨析 · 音节拼读训练',
      from: '#dc2626', to: '#9f1239', text: 'text-red-100',
    },
    {
      key: 'chinese_chengyu',
      emoji: '📜', label: '语文 · 成语典故', sub: '温故知新 · 成语填空闯关',
      from: '#d97706', to: '#92400e', text: 'text-amber-100',
    },
    {
      key: 'math',
      emoji: '📐', label: '数学 · 算术思维', sub: '四则运算 · 几何应用题',
      from: '#059669', to: '#064e3b', text: 'text-emerald-100',
    },
    {
      key: 'english',
      emoji: '🌐', label: '英语 · 语法词汇', sub: '时态句型 · 近义词辨析',
      from: '#4f46e5', to: '#1e1b4b', text: 'text-indigo-100',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10 blur-2xl pointer-events-none" style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        {/* Star dots */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-blue-300/80 text-xs font-medium mb-1.5">
              <span>知新堂 · 第一重天</span>
              <span className="opacity-40">•</span>
              <span className="bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 rounded-full">正堂 Main Hall</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-serif tracking-tight leading-tight">
              欢迎回到正堂，<span className="text-amber-300">{user?.name || '知新使者'}</span>！
            </h1>
            <p className="text-blue-200/70 text-sm mt-2 leading-relaxed">
              师门令（堂课作业）已下发，完成练习即可获取护体星力与【知新星石】。
            </p>
          </div>
          {/* Stats pill */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="bg-white/8 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-3 text-center">
              <div className="text-2xl font-bold text-amber-300">{pendingAssignments.length}</div>
              <div className="text-xs text-blue-200/70 mt-0.5">待完成作业</div>
            </div>
            {doneAssignments.length > 0 && (
              <div className="text-xs text-emerald-300/80 flex items-center gap-1">
                <span>✅</span> 已完成 {doneAssignments.length} 项
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedSubject(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedSubject === t.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
            {'count' in t && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedSubject === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Teacher Assignments ── */}
      {(selectedSubject === 'all' || selectedSubject === 'chinese') && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-sm">📜</span>
              师门下发作业
            </h2>
            <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
              💎 做作业得星石
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-slate-500 text-sm font-medium">所有作业已完成，继续完成下方学科锦囊修业！</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((asgn) => {
                const done = asgn.status === '已打卡';
                const attemptsUsed = getTodayAttemptsUsed(asgn);
                const isMaxAttempts = attemptsUsed >= 3;

                return (
                  <div
                    key={asgn.id}
                    className={`relative rounded-2xl p-5 flex flex-col gap-3 shadow-sm border transition-all duration-200 overflow-hidden ${
                      done
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Accent stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${done ? 'bg-emerald-400' : 'bg-blue-500'}`} />

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {asgn.subject || '语文'}
                          </span>
                          {done && <span className="text-[11px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">✓ 已完成</span>}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isMaxAttempts
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : attemptsUsed > 0
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            🎯 今日次数: {attemptsUsed} / 3
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-base leading-tight">{asgn.poemTitle || '堂课作业'}</h3>
                        {asgn.requirements && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{asgn.requirements}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] text-slate-400">截止日期</div>
                        <div className="text-xs font-semibold text-slate-600">{asgn.dueDate}</div>
                      </div>
                    </div>

                    <button
                      disabled={isMaxAttempts}
                      onClick={() => onStartQuiz(asgn.poemTitle, asgn.questions || [], asgn.id)}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        isMaxAttempts
                          ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-80'
                          : done
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300/60 shadow-sm hover:shadow hover:-translate-y-0.5 cursor-pointer'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                      }`}
                    >
                      {isMaxAttempts ? '🚫 今日打卡已达上限' : done ? '🔄 再练一次' : '🚀 立即开启修业锦囊'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Quest Modules ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-sm">🎯</span>
          <h2 className="text-base font-bold text-slate-800">三学科基础锦囊</h2>
          <span className="text-slate-400 font-normal text-sm">Multi-Subject Core Quests</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {questModules
            .filter(m => {
              if (selectedSubject === 'all') return true;
              if (selectedSubject === 'chinese') return m.key.startsWith('chinese');
              if (selectedSubject === 'math') return m.key === 'math';
              if (selectedSubject === 'english') return m.key === 'english';
              return true;
            })
            .map(m => (
              <div
                key={m.key}
                className="relative rounded-2xl overflow-hidden flex flex-col shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                style={{ background: `linear-gradient(145deg, ${m.from}, ${m.to})` }}
              >
                {/* Glow blob */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-xl" style={{ background: m.from }} />

                <div className="relative z-10 p-5 flex flex-col gap-3 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-2xl backdrop-blur-sm">
                    {m.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm leading-snug">{m.label}</h3>
                    <p className={`text-xs mt-1 leading-relaxed ${m.text}`}>{m.sub}</p>
                  </div>
                  <button
                    onClick={() => {
                      const quiz = getSubjectSampleQuestions(m.key);
                      onStartQuiz(quiz.title, quiz.questions);
                    }}
                    className="w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold border border-white/20 transition-all"
                  >
                    开始练习 →
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

    </div>
  );
};
