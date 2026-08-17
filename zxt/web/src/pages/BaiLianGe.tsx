import React, { useState, useEffect } from 'react';
import { apiService, Poem, PoemQuestion } from '../services/api';
import { playAnswerSFX } from '../utils/sound';
import { StudentQuizPreviewModal } from '../components/StudentQuizPreviewModal';

interface BaiLianGeProps {
  user?: any;
}

export const BaiLianGe: React.FC<BaiLianGeProps> = ({ user }) => {
  const [poems, setPoems] = useState<Poem[]>(() => apiService.getQuizLibrary());
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(() => {
    const lib = apiService.getQuizLibrary();
    return lib.length > 0 ? lib[0] : null;
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDynasty, setSelectedDynasty] = useState<string>('all');

  // Display toggles
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [activeTab, setActiveTab] = useState<'appreciation' | 'scramble' | 'quiz'>('appreciation');

  // Scramble Game state (采莲连句)
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [scrambledChars, setScrambledChars] = useState<string[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [completedLinesCount, setCompletedLinesCount] = useState(0);
  const [scrambleFinished, setScrambleFinished] = useState(false);

  // Full Quiz Runner state
  const [activeStudentQuiz, setActiveStudentQuiz] = useState<{
    poemTitle: string;
    questions: PoemQuestion[];
  } | null>(null);

  useEffect(() => {
    loadPoems();
  }, []);

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
    if (data.length > 0 && !selectedPoem) {
      setSelectedPoem(data[0]);
    }
  };

  const filteredPoems = poems.filter(p => {
    const matchDynasty = selectedDynasty === 'all' || p.dynasty === selectedDynasty;
    const linesText = p.lines ? p.lines.map(l => (typeof l === 'string' ? l : l.text)).join('') : '';
    const matchKeyword = !searchKeyword.trim() ||
      p.title.includes(searchKeyword.trim()) ||
      p.author.includes(searchKeyword.trim()) ||
      linesText.includes(searchKeyword.trim());
    return matchDynasty && matchKeyword;
  });

  // Initialize scramble game for a poem
  const initScrambleGame = (poem: Poem, lineIdx: number = 0) => {
    if (!poem || !poem.lines || poem.lines.length === 0) return;
    const currentLine = poem.lines[lineIdx];
    const targetText = typeof currentLine === 'string' ? currentLine : currentLine.text;
    const chars = targetText.split('');
    const shuffled = [...chars].sort(() => Math.random() - 0.5);
    setScrambledChars(shuffled);
    setSelectedChars([]);
    setActiveLineIdx(lineIdx);
    if (lineIdx === 0) {
      setCompletedLinesCount(0);
      setScrambleFinished(false);
    }
  };

  const handleSelectChar = (char: string, index: number) => {
    setSelectedChars([...selectedChars, char]);
    const updated = [...scrambledChars];
    updated.splice(index, 1);
    setScrambledChars(updated);
  };

  const handleRemoveChar = (char: string, index: number) => {
    const updated = [...selectedChars];
    updated.splice(index, 1);
    setSelectedChars(updated);
    setScrambledChars([...scrambledChars, char]);
  };

  const handleVerifyLine = () => {
    if (!selectedPoem || !selectedPoem.lines) return;
    const targetLine = selectedPoem.lines[activeLineIdx];
    const targetText = typeof targetLine === 'string' ? targetLine : targetLine.text;
    const userText = selectedChars.join('');

    if (userText === targetText) {
      playAnswerSFX('correct');
      const nextCount = completedLinesCount + 1;
      setCompletedLinesCount(nextCount);

      if (activeLineIdx + 1 < selectedPoem.lines.length) {
        setTimeout(() => {
          initScrambleGame(selectedPoem, activeLineIdx + 1);
        }, 800);
      } else {
        setScrambleFinished(true);
        if (user) {
          apiService.recordQuizResult(user.id || 'usr_stu_001', {
            poemTitle: selectedPoem.title,
            poemId: selectedPoem.id,
            score: 100,
            accuracy: '100%',
            quizType: '白莲阁 · 采莲连句闯关'
          });
        }
      }
    } else {
      playAnswerSFX('wrong');
      alert(`差一点点哦！正确顺序是："${targetText}"`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-emerald-800/60 border border-emerald-500/40 text-emerald-200 px-3.5 py-1 rounded-full text-xs font-semibold">
            <span>🪷 白莲阁 (BaiLianGe) · 诗韵流芳</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-serif tracking-wider bg-gradient-to-r from-emerald-200 via-teal-100 to-white bg-clip-text text-transparent">
            白莲阁 · 中华古诗学习与闯关
          </h1>
          <p className="text-emerald-100/90 text-xs sm:text-sm font-serif max-w-2xl">
            品味经典诗词之美，体验“采莲连句”字句拼图与多维精选诗意闯关，于诗情画意中积淀国学素养。
          </p>
        </div>
      </div>

      {/* Main Grid: Left Poem Library & Right Study / Practice Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Poem Directory / Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-serif text-slate-800 flex items-center gap-2">
                <span>📚 诗库目录</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-sans font-bold">
                  {filteredPoems.length} 篇
                </span>
              </h2>
            </div>

            {/* Filter Search */}
            <input
              type="text"
              placeholder="搜索诗名、作者或诗句..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />

            {/* Poems List */}
            <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
              {filteredPoems.map((p) => {
                const isSelected = selectedPoem?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPoem(p);
                      initScrambleGame(p, 0);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-serif font-bold text-sm">《{p.title}》</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        [{p.dynasty || '唐'}] {p.author}
                      </div>
                    </div>
                    {p.theme && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold">
                        {p.theme}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Poem Viewer & Interactive Practice */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPoem ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200/80 space-y-6">
              
              {/* Poem Header & Mode Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 tracking-wide">
                    《{selectedPoem.title}》
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-serif mt-1">
                    〔{selectedPoem.dynasty || '唐'}〕{selectedPoem.author}
                  </p>
                </div>

                {/* Sub Mode Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('appreciation')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === 'appreciation'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📖 赏析诵读
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('scramble');
                      initScrambleGame(selectedPoem, 0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === 'scramble'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🪷 采莲连句
                  </button>
                  {selectedPoem.questions && selectedPoem.questions.length > 0 && (
                    <button
                      onClick={() => {
                        setActiveTab('quiz');
                        setActiveStudentQuiz({
                          poemTitle: selectedPoem.title,
                          questions: selectedPoem.questions || [],
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeTab === 'quiz'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🎯 试题闯关 ({selectedPoem.questions.length}题)
                    </button>
                  )}
                </div>
              </div>

              {/* TAB 1: APPRECIATION & READING */}
              {activeTab === 'appreciation' && (
                <div className="space-y-6">
                  {/* Controls */}
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showPinyin}
                        onChange={(e) => setShowPinyin(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>显示拼音</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showTranslation}
                        onChange={(e) => setShowTranslation(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>显示诗句释义</span>
                    </label>
                  </div>

                  {/* Poem Verses Display */}
                  <div className="text-center py-6 bg-gradient-to-b from-amber-50/40 via-emerald-50/20 to-amber-50/40 rounded-2xl border border-amber-200/60 space-y-4">
                    {selectedPoem.lines && selectedPoem.lines.map((line, idx) => {
                      const textStr = typeof line === 'string' ? line : line.text;
                      const pyStr = typeof line === 'object' ? line.pinyin : '';
                      const cnStr = typeof line === 'object' ? line.cn : '';
                      return (
                        <div key={idx} className="space-y-1">
                          {showPinyin && pyStr && (
                            <div className="text-xs text-amber-800/80 font-mono tracking-widest">
                              {pyStr}
                            </div>
                          )}
                          <div className="text-xl sm:text-2xl font-bold font-serif text-slate-900 tracking-widest">
                            {textStr}
                          </div>
                          {showTranslation && cnStr && (
                            <div className="text-xs text-slate-500 font-serif pt-0.5">
                              {cnStr}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Keywords / Themes */}
                  {selectedPoem.keywords && selectedPoem.keywords.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-600">关键词:</span>
                      {selectedPoem.keywords.map((kw, kwIdx) => (
                        <span key={kwIdx} className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold border border-emerald-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action to Start Practice */}
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => {
                        setActiveTab('scramble');
                        initScrambleGame(selectedPoem, 0);
                      }}
                      className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                    >
                      <span>🪷 开始“采莲连句”挑战</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LOTUS SCRAMBLE GAME (采莲连句) */}
              {activeTab === 'scramble' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800">
                      🪷 采莲连句进度: 第 {activeLineIdx + 1} / {selectedPoem.lines?.length || 0} 句
                    </span>
                    <span className="text-slate-500">
                      已拼成 {completedLinesCount} 句
                    </span>
                  </div>

                  {!scrambleFinished ? (
                    <div className="space-y-6">
                      {/* Target Assembly Line */}
                      <div className="min-h-[72px] bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl p-4 flex flex-wrap gap-2 justify-center items-center">
                        {selectedChars.length === 0 ? (
                          <span className="text-xs text-amber-700 italic">点击下方汉字连成正确诗句</span>
                        ) : (
                          selectedChars.map((char, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRemoveChar(char, idx)}
                              className="w-11 h-11 bg-amber-500 text-white font-bold rounded-xl shadow-sm text-xl hover:bg-amber-600 font-serif cursor-pointer transition transform hover:scale-105"
                            >
                              {char}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Scrambled Pool */}
                      <div className="flex flex-wrap gap-3 justify-center py-2">
                        {scrambledChars.map((char, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectChar(char, idx)}
                            className="w-12 h-12 bg-slate-100 hover:bg-emerald-100 border border-slate-300 hover:border-emerald-400 text-slate-800 font-serif font-bold rounded-2xl text-xl shadow-xs transition cursor-pointer transform hover:scale-105"
                          >
                            {char}
                          </button>
                        ))}
                      </div>

                      {/* Submit / Reset Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => initScrambleGame(selectedPoem, activeLineIdx)}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          重置本句
                        </button>
                        <button
                          onClick={handleVerifyLine}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md transition cursor-pointer"
                        >
                          ✅ 验证本句答案
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 space-y-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                      <span className="text-5xl">🎉</span>
                      <h4 className="text-2xl font-bold font-serif text-emerald-800">
                        恭喜！完成《{selectedPoem.title}》全篇采莲连句！
                      </h4>
                      <p className="text-xs text-slate-600 font-serif">
                        诗情意境尽在心中，获得打卡记录与智慧成就！
                      </p>
                      <button
                        onClick={() => initScrambleGame(selectedPoem, 0)}
                        className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md transition hover:bg-emerald-500 cursor-pointer"
                      >
                        再次练习
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: QUIZ RUNNER (MODAL) */}
              {activeTab === 'quiz' && (
                <div className="text-center py-12 space-y-4">
                  <div className="text-4xl">🎯</div>
                  <h3 className="text-lg font-bold font-serif text-slate-800">
                    《{selectedPoem.title}》全量互动题库
                  </h3>
                  <p className="text-xs text-slate-500">
                    包含连句、填空、字音、诗意辨析与插图关联题目共 {selectedPoem.questions?.length || 0} 道
                  </p>
                  <button
                    onClick={() => setActiveStudentQuiz({
                      poemTitle: selectedPoem.title,
                      questions: selectedPoem.questions || [],
                    })}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs shadow-md transition cursor-pointer"
                  >
                    🚀 打开闯关界面
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-serif">
              请从左侧选择一篇古诗开始学习
            </div>
          )}
        </div>

      </div>

      {/* Student Quiz Preview Modal */}
      {activeStudentQuiz && (
        <StudentQuizPreviewModal
          poemTitle={activeStudentQuiz.poemTitle}
          questions={activeStudentQuiz.questions}
          initialIndex={0}
          onClose={() => setActiveStudentQuiz(null)}
        />
      )}
    </div>
  );
};

export default BaiLianGe;
