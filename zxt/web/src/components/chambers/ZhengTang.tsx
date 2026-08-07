import React, { useState } from 'react';
import { PoemQuestion } from '../../services/api';
import { AvatarDisplay, AvatarConfig } from '../AvatarDisplay';

interface ZhengTangProps {
  user: any;
  assignments: any[];
  onStartQuiz: (title: string, questions: PoemQuestion[], assignmentId?: string) => void;
  avatarConfig?: AvatarConfig;
}

export const ZhengTang: React.FC<ZhengTangProps> = ({
  user,
  assignments,
  onStartQuiz,
  avatarConfig
}) => {
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'chinese' | 'math' | 'english'>('all');

  // Sample questions generator for Chinese (识字, 拼音, 古诗, 成语), Math, English
  const getSubjectSampleQuestions = (subject: string): { title: string; questions: PoemQuestion[] } => {
    if (subject === 'chinese_pinyin') {
      return {
        title: '语文 · 拼音专项练习',
        questions: [
          {
            id: 'cn_py_1',
            type: 'VerseCloze',
            prompt: '请选择“水波”中“波”字正确的声调与拼音：',
            options: ['bō', 'bó', 'bǒ', 'bò'],
            answer: 0,
            explanation: '波 (bō) 第一声，组词：水波、波浪。'
          },
          {
            id: 'cn_py_2',
            type: 'VerseCloze',
            prompt: '“光明”的“明”字拼音是：',
            options: ['míng', 'mín', 'míngg', 'míngn'],
            answer: 0,
            explanation: '明 (míng) 后鼻音。'
          }
        ]
      };
    } else if (subject === 'chinese_chengyu') {
      return {
        title: '语文 · 成语典故练习',
        questions: [
          {
            id: 'cn_cy_1',
            type: 'VerseCloze',
            prompt: '请补全成语：温故而____',
            options: ['知新', '知旧', '知足', '知心'],
            answer: 0,
            explanation: '温故而知新，出自《论语》。'
          },
          {
            id: 'cn_cy_2',
            type: 'VerseCloze',
            prompt: '形容学习刻苦，读书不知疲倦的成语是：',
            options: ['手不释卷', '走马观花', '囫囵吞枣', '浅尝辄止'],
            answer: 0,
            explanation: '手不释卷：书本不离手。'
          }
        ]
      };
    } else if (subject === 'math') {
      return {
        title: '数学 · 基础算术与思维开发',
        questions: [
          {
            id: 'math_1',
            type: 'VerseCloze',
            prompt: '计算：25 × 4 + 35 = ?',
            options: ['135', '125', '145', '115'],
            answer: 0,
            explanation: '25 × 4 = 100，100 + 35 = 135。'
          },
          {
            id: 'math_2',
            type: 'VerseCloze',
            prompt: '一个正方形的边长是 6 厘米，它的周长是：',
            options: ['24 厘米', '36 厘米', '12 厘米', '18 厘米'],
            answer: 0,
            explanation: '正方形周长 = 边长 × 4 = 6 × 4 = 24 厘米。'
          }
        ]
      };
    } else if (subject === 'english') {
      return {
        title: '英语 · 词汇与常用句型',
        questions: [
          {
            id: 'en_1',
            type: 'VerseCloze',
            prompt: 'Choose the correct word: "She ____ to school every morning."',
            options: ['walks', 'walked', 'walking', 'walk'],
            answer: 0,
            explanation: 'Third person singular simple present tense: walks.'
          },
          {
            id: 'en_2',
            type: 'VerseCloze',
            prompt: 'What is the synonym of "Happy"?',
            options: ['Joyful', 'Sad', 'Angry', 'Tired'],
            answer: 0,
            explanation: 'Joyful means full of happiness.'
          }
        ]
      };
    }

    // Default Chinese Literacy/Character
    return {
      title: '语文 · 识字与笔顺强化',
      questions: [
        {
          id: 'cn_sz_1',
          type: 'VerseCloze',
          prompt: '“静夜思”中“静”字的偏旁部首是：',
          options: ['青', '争', '立', '月'],
          answer: 0,
          explanation: '静为左右结构，部首为“青”。'
        }
      ]
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <AvatarDisplay config={avatarConfig} size="lg" className="ring-4 ring-amber-400/40" />
            <div>
              <div className="flex items-center gap-2 text-blue-300 font-medium mb-1 text-xs">
                <span>知新堂 · 第一重天</span>
                <span>•</span>
                <span className="bg-blue-800/60 px-2 py-0.5 rounded">正堂 Main Hall</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-serif tracking-tight">
                欢迎回到正堂，{user?.name || '知新使者'}！
              </h1>
              <p className="text-blue-200/80 text-sm mt-1">
                师门令（堂课作业）已下发，完成练习即可获取护体星力与【知新星石】。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedSubject === 'all'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          📚 全部锦囊 Scrolls ({assignments.length + 4})
        </button>
        <button
          onClick={() => setSelectedSubject('chinese')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedSubject === 'chinese'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          📖 语文 (Chinese)
        </button>
        <button
          onClick={() => setSelectedSubject('math')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedSubject === 'math'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          📐 数学 (Math)
        </button>
        <button
          onClick={() => setSelectedSubject('english')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
            selectedSubject === 'english'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔤 英语 (English)
        </button>
      </div>

      {/* Teacher Assigned Homework Section */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📜</span> 师门下发作业 (Teacher Assignments)
          </span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold">
            做作业得星石 💎
          </span>
        </h2>

        {assignments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            暂无未完成的教师发布作业，可完成下方学科锦囊进行修业！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((asgn) => (
              <div
                key={asgn.id}
                className="border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                      {asgn.subject || '语文'}
                    </span>
                    <span>截止日期: {asgn.dueDate}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">{asgn.poemTitle || '堂课作业'}</h3>
                  <p className="text-xs text-slate-600 mt-1">{asgn.requirements}</p>
                </div>
                <button
                  onClick={() => onStartQuiz(asgn.poemTitle, asgn.questions || [], asgn.id)}
                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shadow"
                >
                  🚀 立即开启修业锦囊
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Subject Interactive Quest Modules */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>🎯</span> 三学科基础锦囊 (Multi-Subject Core Quests)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chinese Pinyin */}
          <div className="border border-red-100 bg-red-50/50 hover:bg-red-50 rounded-xl p-4 transition flex flex-col justify-between">
            <div>
              <div className="text-2xl mb-2">🔤</div>
              <h3 className="font-bold text-slate-800 text-sm">语文 · 拼音专项</h3>
              <p className="text-xs text-slate-500 mt-1">一声二声三声四声，声调辨析训练</p>
            </div>
            <button
              onClick={() => {
                const quiz = getSubjectSampleQuestions('chinese_pinyin');
                onStartQuiz(quiz.title, quiz.questions);
              }}
              className="mt-4 w-full py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
            >
              开始练习
            </button>
          </div>

          {/* Chinese Idioms */}
          <div className="border border-amber-100 bg-amber-50/50 hover:bg-amber-50 rounded-xl p-4 transition flex flex-col justify-between">
            <div>
              <div className="text-2xl mb-2">📜</div>
              <h3 className="font-bold text-slate-800 text-sm">语文 · 成语典故</h3>
              <p className="text-xs text-slate-500 mt-1">温故知新、手不释卷，成语填空</p>
            </div>
            <button
              onClick={() => {
                const quiz = getSubjectSampleQuestions('chinese_chengyu');
                onStartQuiz(quiz.title, quiz.questions);
              }}
              className="mt-4 w-full py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
            >
              开始练习
            </button>
          </div>

          {/* Math Arithmetic */}
          <div className="border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-4 transition flex flex-col justify-between">
            <div>
              <div className="text-2xl mb-2">📐</div>
              <h3 className="font-bold text-slate-800 text-sm">数学 · 算术与思维</h3>
              <p className="text-xs text-slate-500 mt-1">四则混合运算、几何周长应用题</p>
            </div>
            <button
              onClick={() => {
                const quiz = getSubjectSampleQuestions('math');
                onStartQuiz(quiz.title, quiz.questions);
              }}
              className="mt-4 w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
            >
              开始练习
            </button>
          </div>

          {/* English Grammar */}
          <div className="border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-4 transition flex flex-col justify-between">
            <div>
              <div className="text-2xl mb-2">🌐</div>
              <h3 className="font-bold text-slate-800 text-sm">英语 · 语法与词汇</h3>
              <p className="text-xs text-slate-500 mt-1">常用时态、近义词与常用句型</p>
            </div>
            <button
              onClick={() => {
                const quiz = getSubjectSampleQuestions('english');
                onStartQuiz(quiz.title, quiz.questions);
              }}
              className="mt-4 w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
            >
              开始练习
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
