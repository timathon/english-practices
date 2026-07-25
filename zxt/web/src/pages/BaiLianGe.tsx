import React, { useState, useEffect } from 'react';
import { apiService, Poem } from '../services/api';

interface BaiLianGeProps {
  activeView: 'student' | 'parent' | 'teacher' | 'editor' | 'admin';
  user: any;
}

export const BaiLianGe: React.FC<BaiLianGeProps> = ({ activeView, user }) => {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'quiz' | 'garden' | 'teacher' | 'editor'>('map');
  const [showPinyin, setShowPinyin] = useState(true);

  // Quiz editor state
  const [editingPoem, setEditingPoem] = useState<Poem | null>(null);
  const [editorSuccessMsg, setEditorSuccessMsg] = useState('');
  
  // Quiz runner state
  const [quizScore, setQuizScore] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [scrambledWords, setScrambledWords] = useState<string[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [unlockedScrolls, setUnlockedScrolls] = useState<string[]>(['🪷 白莲神韵', '📜 池上古卷']);

  useEffect(() => {
    loadPoems();
  }, []);

  const loadPoems = async () => {
    const data = await apiService.getPoems();
    setPoems(data);
    if (data.length > 0) {
      setSelectedPoem(data[0]); // Default to 《池上》
      setupQuiz(data[0]);
    }
  };

  const setupQuiz = (poem: Poem) => {
    if (!poem || !poem.lines || poem.lines.length === 0) return;
    const firstLineObj = poem.lines[0];
    const targetLine = typeof firstLineObj === 'string' ? firstLineObj : firstLineObj.text; // e.g. "小娃撑小艇"
    const chars = targetLine.split('');
    // Shuffle chars
    const shuffled = [...chars].sort(() => Math.random() - 0.5);
    setScrambledWords(shuffled);
    setSelectedWords([]);
    setQuizCompleted(false);
  };

  const handleSelectChar = (char: string, index: number) => {
    setSelectedWords([...selectedWords, char]);
    const updated = [...scrambledWords];
    updated.splice(index, 1);
    setScrambledWords(updated);
  };

  const handleRemoveChar = (char: string, index: number) => {
    const updated = [...selectedWords];
    updated.splice(index, 1);
    setSelectedWords(updated);
    setScrambledWords([...scrambledWords, char]);
  };

  const handleVerifyQuiz = () => {
    if (!selectedPoem) return;
    const answer = selectedWords.join('');
    const firstLineObj = selectedPoem.lines[0];
    const targetLine = typeof firstLineObj === 'string' ? firstLineObj : firstLineObj.text;
    if (answer === targetLine) {
      setQuizScore(quizScore + 10);
      setQuizCompleted(true);
      if (!unlockedScrolls.includes(`🪷 ${selectedPoem.title}印章`)) {
        setUnlockedScrolls([...unlockedScrolls, `🪷 ${selectedPoem.title}印章`]);
      }
    } else {
      alert(`差一点点哦！正确顺序是："${targetLine}"`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
      
      {/* Module Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-jade-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-jade-700/50">
        
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-800/80 border border-emerald-500/40 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
            <span>🪷 知新堂 语文旗舰模块</span>
            <span>•</span>
            <span>全集75首经典古诗词</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-serif tracking-tight bg-gradient-to-r from-emerald-300 via-jade-300 to-teal-100 bg-clip-text text-transparent">
            白莲阁
          </h1>
          <p className="text-emerald-100 text-sm italic font-serif">
            “小娃撑小艇，偷采白莲回。不解藏踪迹，浮萍一道开。” —— 唐·白居易《池上》
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'map' ? 'bg-jade-500 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🗺️ 山水地图
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'quiz' ? 'bg-jade-500 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🧩 采莲闯关
          </button>

          <button
            onClick={() => setActiveTab('garden')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'garden' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📜 拾遗画卷 ({unlockedScrolls.length})
          </button>

          {(activeView === 'editor' || activeView === 'admin') && (
            <button
              onClick={() => {
                setActiveTab('editor');
                setEditingPoem(selectedPoem || poems[0]);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'editor' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ✍️ 题库/题目编辑
            </button>
          )}

          {(activeView === 'teacher' || activeView === 'admin') && (
            <button
              onClick={() => setActiveTab('teacher')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'teacher' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              👩‍🏫 教师/字帖工具
            </button>
          )}
        </div>

      </div>

      {/* MAIN TAB CONTENT */}
      
      {/* MAP & POEM EXPLORER */}
      {activeTab === 'map' && (
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left: 75 Poems Scroll List */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-ink text-sm font-serif">古诗词名录 ({poems.length}首)</h3>
              <span className="text-[10px] text-jade-700 bg-jade-50 px-2 py-0.5 rounded font-bold">新课标统编本</span>
            </div>

            <div className="space-y-2">
              {poems.map((poem) => (
                <div
                  key={poem.id}
                  onClick={() => {
                    setSelectedPoem(poem);
                    setupQuiz(poem);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                    selectedPoem?.id === poem.id
                      ? 'border-jade-500 bg-jade-50/80 shadow-sm'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-ink font-serif flex items-center space-x-2">
                      <span className="text-xs text-jade-700 font-mono">#{poem.id}</span>
                      <span>《{poem.title}》</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      [{poem.dynasty}] {poem.author} • <span className="text-slate-400">{poem.theme}</span>
                    </div>
                  </div>
                  {selectedPoem?.id === poem.id && (
                    <span className="text-xs text-jade-600 font-bold">🪷</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Selected Poem Detailed Canvas */}
          {selectedPoem && (
            <div className="md:col-span-2 bg-amber-50/40 p-6 sm:p-8 rounded-2xl border border-amber-200/80 shadow-sm space-y-6 relative overflow-hidden">
              
              <div className="flex justify-between items-start border-b border-amber-200 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-amber-200/60 text-amber-900 text-xs font-bold rounded">
                    [{selectedPoem.dynasty}] {selectedPoem.author}
                  </span>
                  <h2 className="text-3xl font-black font-serif text-ink mt-1">《{selectedPoem.title}》</h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowPinyin(!showPinyin)}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-bold shadow-xs hover:bg-amber-100 transition"
                  >
                    {showPinyin ? '隐藏拼音' : '显示拼音'}
                  </button>
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className="px-4 py-1.5 bg-jade-600 hover:bg-jade-500 text-white rounded-lg text-xs font-bold shadow-md transition"
                  >
                    🧩 开始采莲闯关
                  </button>
                </div>
              </div>

              {/* Verses Rendering with Ruby Pinyin */}
              <div className="space-y-6 text-center py-4 bg-white/70 p-6 rounded-xl border border-amber-100">
                {selectedPoem.lines.map((lineObj, idx) => {
                  const text = typeof lineObj === 'string' ? lineObj : lineObj.text;
                  const pinyin = typeof lineObj === 'string' ? '' : lineObj.pinyin;
                  const en = typeof lineObj === 'string' ? '' : lineObj.en;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="text-2xl sm:text-3xl font-serif text-slate-800 tracking-widest font-bold leading-loose">
                        {showPinyin && pinyin ? (
                          <ruby className="ruby-text">
                            {text}
                            <rt className="text-xs font-mono font-normal text-amber-800 tracking-normal block mb-1">
                              {pinyin}
                            </rt>
                          </ruby>
                        ) : (
                          text
                        )}
                      </div>
                      {en && (
                        <p className="text-xs text-slate-400 font-sans tracking-normal italic">{en}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Translation & Pedagogy */}
              <div className="bg-white p-5 rounded-xl border border-amber-200 text-xs space-y-2 text-slate-700">
                <div className="font-bold text-amber-900 flex items-center">
                  <span className="mr-1">📜</span> 赏析与译文 (Modern Translation):
                </div>
                {(() => {
                  const fullCn = selectedPoem.lines.map(l => typeof l === 'string' ? '' : l.cn || '').filter(Boolean).join('；');
                  const fullEn = selectedPoem.lines.map(l => typeof l === 'string' ? '' : l.en || '').filter(Boolean).join(' ');
                  return (
                    <>
                      {fullCn && <p className="leading-relaxed text-slate-600 italic">"{fullCn}"</p>}
                      {fullEn && <p className="leading-relaxed text-slate-500 font-sans">"{fullEn}"</p>}
                    </>
                  );
                })()}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-500">核心词汇 (Keywords):</span>
                  {selectedPoem.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* QUIZ RUNNER TAB */}
      {activeTab === 'quiz' && selectedPoem && (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md space-y-8 max-w-3xl mx-auto">
          
          <div className="text-center space-y-2 border-b border-slate-100 pb-6">
            <span className="px-3 py-1 bg-jade-100 text-jade-800 text-xs font-bold rounded-full">
              白莲阁 • 采莲排词成句闯关
            </span>
            <h2 className="text-2xl font-bold font-serif text-ink">
              请点击字符，拼接出《{selectedPoem.title}》的第一句诗
            </h2>
            <p className="text-xs text-slate-500">
              当前积分: <span className="font-bold text-jade-600 text-sm">{quizScore}</span> 分
            </p>
          </div>

          {/* Answer Drop Zone */}
          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-jade-300 min-h-[90px] flex items-center justify-center flex-wrap gap-3">
            {selectedWords.length === 0 ? (
              <span className="text-slate-400 text-sm">请点击下方的字块放入此处...</span>
            ) : (
              selectedWords.map((char, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRemoveChar(char, idx)}
                  className="w-12 h-12 bg-jade-600 text-white font-serif font-bold text-xl rounded-xl shadow-md hover:bg-red-500 transition flex items-center justify-center"
                >
                  {char}
                </button>
              ))
            )}
          </div>

          {/* Scrambled Choices Zone */}
          <div className="flex items-center justify-center flex-wrap gap-3 py-4">
            {scrambledWords.map((char, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectChar(char, idx)}
                className="w-12 h-12 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-serif font-bold text-xl rounded-xl shadow-sm transition flex items-center justify-center"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Verify Button */}
          <div className="text-center pt-4">
            {quizCompleted ? (
              <div className="space-y-4">
                <div className="p-4 bg-jade-50 border border-jade-200 text-jade-800 rounded-xl font-bold text-base flex items-center justify-center space-x-2">
                  <span>🎉 恭喜回答正确！解锁【🪷 {selectedPoem.title}印章】</span>
                </div>
                <button
                  onClick={() => setupQuiz(selectedPoem)}
                  className="px-6 py-2.5 bg-jade-600 hover:bg-jade-500 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  再测一次 / 刷新字块
                </button>
              </div>
            ) : (
              <button
                onClick={handleVerifyQuiz}
                disabled={selectedWords.length === 0}
                className="px-8 py-3 bg-jade-600 hover:bg-jade-500 text-white font-bold rounded-xl text-sm shadow-lg transition disabled:opacity-40"
              >
                验证答案
              </button>
            )}
          </div>

        </div>
      )}

      {/* MYTHICAL SCROLL GARDEN */}
      {activeTab === 'garden' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-bold font-serif text-ink">拾遗画卷 (Mythical Scroll Garden)</h2>
            <p className="text-xs text-slate-500">通过古诗测试收集诗意印章与白莲汉字部首</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {unlockedScrolls.map((scroll, i) => (
              <div key={i} className="bg-amber-50/60 p-5 rounded-xl border border-amber-200 text-center space-y-2">
                <div className="text-3xl">🪷</div>
                <div className="font-bold text-sm text-amber-900 font-serif">{scroll}</div>
                <span className="inline-block text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">
                  已解锁
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUIZ MANAGER / QUESTION EDITOR TOOLKIT */}
      {activeTab === 'editor' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full text-xs font-bold mb-1">
                <span>✍️ 题目编辑器 (Quiz Manager & Question Editor)</span>
              </div>
              <h2 className="text-2xl font-bold font-serif text-ink">古诗词题库与干扰项校验工坊</h2>
              <p className="text-xs text-slate-500">题库编辑与校对权限 (Role: {user?.name || 'Quiz Editor'})</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-mono font-bold">
              Poem ID: #{editingPoem?.id || 1}
            </span>
          </div>

          {editorSuccessMsg && (
            <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold">
              {editorSuccessMsg}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 text-xs">
            {/* Left Poem Selector */}
            <div className="space-y-2 border-r border-slate-100 pr-4 max-h-96 overflow-y-auto">
              <label className="font-bold text-slate-700 block">选择待编辑诗词 (Select Poem)</label>
              {poems.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setEditingPoem(p);
                    setEditorSuccessMsg('');
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border font-serif transition flex justify-between items-center ${
                    editingPoem?.id === p.id ? 'border-teal-500 bg-teal-50/80 font-bold text-teal-900' : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>#{p.id} 《{p.title}》</span>
                  <span className="text-[10px] text-slate-400">[{p.dynasty}] {p.author}</span>
                </button>
              ))}
            </div>

            {/* Right Editor Form Panel */}
            {editingPoem && (
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">诗词题目 (Title)</label>
                    <input
                      type="text"
                      value={editingPoem.title}
                      onChange={(e) => setEditingPoem({ ...editingPoem, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">朝代与作者 (Dynasty & Author)</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editingPoem.dynasty}
                        onChange={(e) => setEditingPoem({ ...editingPoem, dynasty: e.target.value })}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="朝代"
                      />
                      <input
                        type="text"
                        value={editingPoem.author}
                        onChange={(e) => setEditingPoem({ ...editingPoem, author: e.target.value })}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="作者"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">诗句与逐句译文 (Lines & Line-by-Line Translations)</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto border border-slate-200 p-3 rounded-lg bg-slate-50">
                    {editingPoem.lines.map((lineObj, idx) => {
                      const text = typeof lineObj === 'string' ? lineObj : lineObj.text;
                      const pinyin = typeof lineObj === 'string' ? '' : lineObj.pinyin;
                      const cn = typeof lineObj === 'string' ? '' : lineObj.cn || '';
                      const en = typeof lineObj === 'string' ? '' : lineObj.en || '';
                      return (
                        <div key={idx} className="bg-white p-3 rounded border border-slate-200 space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={text}
                              onChange={(e) => {
                                const updatedLines = [...editingPoem.lines];
                                updatedLines[idx] = { text: e.target.value, pinyin, cn, en };
                                setEditingPoem({ ...editingPoem, lines: updatedLines });
                              }}
                              className="w-1/2 px-2.5 py-1 border border-slate-300 rounded font-serif text-xs font-bold"
                              placeholder="诗句原文本"
                            />
                            <input
                              type="text"
                              value={pinyin}
                              onChange={(e) => {
                                const updatedLines = [...editingPoem.lines];
                                updatedLines[idx] = { text, pinyin: e.target.value, cn, en };
                                setEditingPoem({ ...editingPoem, lines: updatedLines });
                              }}
                              className="w-1/2 px-2.5 py-1 border border-slate-300 rounded font-mono text-xs"
                              placeholder="拼音 pīnyīn"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={cn}
                              onChange={(e) => {
                                const updatedLines = [...editingPoem.lines];
                                updatedLines[idx] = { text, pinyin, cn: e.target.value, en };
                                setEditingPoem({ ...editingPoem, lines: updatedLines });
                              }}
                              className="w-1/2 px-2.5 py-1 border border-slate-300 rounded text-xs"
                              placeholder="中文单句译文"
                            />
                            <input
                              type="text"
                              value={en}
                              onChange={(e) => {
                                const updatedLines = [...editingPoem.lines];
                                updatedLines[idx] = { text, pinyin, cn, en: e.target.value };
                                setEditingPoem({ ...editingPoem, lines: updatedLines });
                              }}
                              className="w-1/2 px-2.5 py-1 border border-slate-300 rounded text-xs"
                              placeholder="English Line Translation"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setEditorSuccessMsg(`已更新《${editingPoem.title}》的题目与诗句数据！(Saved)`);
                      // Update in memory list
                      setPoems(poems.map(p => p.id === editingPoem.id ? editingPoem : p));
                    }}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs shadow-md transition"
                  >
                    💾 保存题目改动
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEACHER TOOLKIT */}
      {activeTab === 'teacher' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-bold font-serif text-ink">教师字帖与作业发布工具 (Teacher PDF & Homework Builder)</h2>
            <p className="text-xs text-slate-500">一键生成包含米字格、拼音留空白与诗句连线的可打印 PDF 字帖</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-ink text-sm">🖨️ PDF 可打印字帖生成器</h3>
              <p className="text-slate-600">为《池上》《江南》《悯农》自动生成带有标准米字格和笔顺引导的 A4 打印字帖。</p>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm transition"
              >
                导出/打印本诗 A4 字帖
              </button>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-ink text-sm">📲 30秒一键布置诗词作业</h3>
              <p className="text-slate-600">向三年级A班发送今日背诵《池上》与采莲答题打卡任务。</p>
              <button
                onClick={() => alert('作业已成功推送到【三年级A班】全员学生/家长端！')}
                className="px-4 py-2 bg-jade-600 hover:bg-jade-500 text-white font-bold rounded-lg shadow-sm transition"
              >
                发布到班级
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
