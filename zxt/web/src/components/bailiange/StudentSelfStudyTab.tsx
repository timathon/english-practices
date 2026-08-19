import React, { useState } from 'react';
import { CachedImage } from '../CachedImage';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { StudentQuizPreviewModal } from '../StudentQuizPreviewModal';

interface StudentSelfStudyTabProps {
  poems: any[];
  learntPoemIds: any[];
  selectedPoem: any;
  onSelectPoem: (poem: any) => void;
  subject?: 'chinese' | 'math' | 'english';
  chineseSubTab?: 'gushi' | 'chengyu' | 'shizi' | 'pinyin';
}

// ── Self Study Poem Detail Modal ─────────────────────────────────────────────
export const PoemStudyDetailModal: React.FC<{
  poem: any;
  isLearnt: boolean;
  onClose: () => void;
}> = ({ poem, isLearnt, onClose }) => {
  useLockBodyScroll(true);

  const [showPinyin, setShowPinyin] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showImages, setShowImages] = useState(true);

  return (
    <div
      className="fixed inset-0 !mt-0 !m-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 sm:p-6 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold rounded-full">
                  拓展自学
                </span>
                {isLearnt ? (
                  <span className="px-2 py-0.5 bg-teal-400 text-teal-950 text-xs font-extrabold rounded-full">
                    ✓ 已学
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-white/20 text-emerald-100 text-xs font-medium rounded-full">
                    未解锁
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-wide pt-1">
                《{poem.title}》
                <span className="text-sm sm:text-base font-normal text-emerald-200 ml-2 font-sans">
                  [{poem.dynasty}] {poem.author}
                </span>
              </h2>
              {poem.theme && (
                <div className="text-xs text-emerald-300/80 font-sans">
                  主题：{poem.theme}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl leading-none p-1 rounded-lg hover:bg-white/10 transition"
              title="关闭"
            >
              ✕
            </button>
          </div>

          {/* 4 View Toggles: 拼音, 原文, 译文, 图片 */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={() => setShowPinyin(!showPinyin)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                showPinyin
                  ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                  : 'bg-white/15 text-white/70 border-white/20 hover:bg-white/25'
              }`}
            >
              拼音
            </button>

            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                showOriginal
                  ? 'bg-blue-500 text-white border-blue-400 shadow-sm'
                  : 'bg-white/15 text-white/70 border-white/20 hover:bg-white/25'
              }`}
            >
              原文
            </button>

            <button
              type="button"
              onClick={() => setShowTranslation(!showTranslation)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                showTranslation
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                  : 'bg-white/15 text-white/70 border-white/20 hover:bg-white/25'
              }`}
            >
              译文
            </button>

            <button
              type="button"
              onClick={() => setShowImages(!showImages)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                showImages
                  ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                  : 'bg-white/15 text-white/70 border-white/20 hover:bg-white/25'
              }`}
            >
              图片
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
          {/* Poem Text & Media Cards */}
          <div className="bg-amber-50/50 p-4 sm:p-5 rounded-2xl border border-amber-200/60 grid grid-cols-1 lg:grid-cols-2 gap-4 text-center">
            {poem.lines?.map((lineObj: any, idx: number) => {
              const text = typeof lineObj === 'string' ? lineObj : lineObj.text;
              const pinyin = typeof lineObj === 'string' ? '' : lineObj.pinyin;
              const cn = typeof lineObj === 'string' ? '' : (lineObj.cn || lineObj.meaning);
              const imgUrl = typeof lineObj === 'string' ? '' : lineObj.image;

              return (
                <div
                  key={idx}
                  className={`space-y-2 p-4 rounded-xl border text-center transition flex flex-col justify-between ${
                    idx % 2 === 1
                      ? 'bg-amber-50/70 border-amber-200/50'
                      : 'bg-white/95 border-amber-100/60 shadow-2xs'
                  }`}
                >
                  {/* Original Text with optional Pinyin */}
                  {showOriginal && (
                    <div className="text-xl sm:text-2xl font-serif font-bold text-slate-800 tracking-wider">
                      {showPinyin && pinyin ? (
                        <ruby>
                          {text}
                          <rt className="text-xs text-amber-800 font-sans font-normal">{pinyin}</rt>
                        </ruby>
                      ) : (
                        text
                      )}
                    </div>
                  )}

                  {/* Line Translation */}
                  {showTranslation && cn && (
                    <div className="text-sm sm:text-base text-slate-700 font-medium font-sans leading-relaxed pt-0.5">
                      {cn}
                    </div>
                  )}

                  {/* Line Image */}
                  {showImages && imgUrl && (
                    <div className="pt-2 max-w-[210px] mx-auto w-full">
                      <CachedImage
                        src={imgUrl}
                        alt={`line-${idx}`}
                        className="rounded-xl border border-amber-200/80 shadow-2xs mx-auto object-contain aspect-square w-full bg-amber-50/30"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Extra Knowledge Sections */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-1.5">
              <strong className="text-ink text-base font-bold flex items-center gap-1.5 font-serif">
                <span>📖</span> 诗人背景故事
              </strong>
              <p className="text-slate-700 text-sm leading-relaxed">
                {poem.author}是{poem.dynasty}代著名诗人，其诗风通俗易懂，深受百姓喜爱。作品充满童真与生活气息。
              </p>
            </div>
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-1.5">
              <strong className="text-ink text-base font-bold flex items-center gap-1.5 font-serif">
                <span>💡</span> 诗词赏析与意境
              </strong>
              <p className="text-slate-700 text-sm leading-relaxed">
                主题：{poem.theme || '经典咏怀'}。关键词包括: {poem.keywords?.join('、') || '自然、意境'}。展现了自然景象与生动的画面感。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentSelfStudyTab: React.FC<StudentSelfStudyTabProps> = ({
  poems,
  learntPoemIds,
  selectedPoem,
  onSelectPoem,
  subject = 'chinese',
  chineseSubTab = 'gushi',
}) => {
  const [activeModalPoem, setActiveModalPoem] = useState<any | null>(null);
  const [activeQuizPreviewPoem, setActiveQuizPreviewPoem] = useState<any | null>(null);

  if (subject === 'math') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <div className="text-4xl">📐</div>
        <h3 className="text-lg font-bold text-slate-800">数学 · 自主拓展学习</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          提供算术巧算、几何图形与数理逻辑自主研习资源，包含重难点动画演练与自测习题。
        </p>
      </div>
    );
  }

  if (subject === 'english') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <div className="text-4xl">🔤</div>
        <h3 className="text-lg font-bold text-slate-800">英语 · 自主拓展学习</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          包含自然拼读、常用词汇卡片、听力对话朗读与分级阅读自主研习。
        </p>
      </div>
    );
  }

  if (subject === 'chinese' && chineseSubTab === 'chengyu') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <div className="text-4xl">🐉</div>
        <h3 className="text-lg font-bold text-slate-800">语文 · 成语自主学习</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          成语接龙、成语释义典故、看图识成语与趣味成语闯关自学模块正在建设中。
        </p>
      </div>
    );
  }

  if (subject === 'chinese' && chineseSubTab === 'shizi') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <div className="text-4xl">✍️</div>
        <h3 className="text-lg font-bold text-slate-800">语文 · 识字自主学习</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          部首结构、笔顺描红、形近字辨析与字义拓展学习模块正在建设中。
        </p>
      </div>
    );
  }

  if (subject === 'chinese' && chineseSubTab === 'pinyin') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
        <div className="text-4xl">🔡</div>
        <h3 className="text-lg font-bold text-slate-800">语文 · 拼音自主学习</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          声母韵母发音、声调规则、拼读卡片与易混音辨析自主学习模块正在建设中。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Header Info */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold font-serif text-ink">全量古诗库 ({poems.length}首)</h3>
          <p className="text-xs text-slate-500">点击【详情】研读古诗意境，点击【习题】免积分免成绩自由练习与自测。</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
          已解锁 {learntPoemIds.length} / {poems.length} 首
        </span>
      </div>

      {/* Grid of Poem Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {poems.map((poem) => {
          const isLearnt = learntPoemIds.map(Number).includes(Number(poem.id));
          const questionCount = poem.questions?.length || 0;

          return (
            <div
              key={poem.id}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 group hover:shadow-md ${
                isLearnt
                  ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                  : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold font-serif text-ink text-sm flex items-center gap-1.5 group-hover:text-emerald-800">
                    <span className="text-teal-700 font-mono">#{poem.id}</span>
                    <span>《{poem.title}》</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    [{poem.dynasty}] {poem.author}
                    {poem.theme && <span className="ml-1.5 text-slate-400">· {poem.theme}</span>}
                  </div>
                </div>

                {isLearnt ? (
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 font-sans font-bold rounded whitespace-nowrap">
                    已学
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-slate-200/70 text-slate-500 font-sans font-medium rounded whitespace-nowrap">
                    未学
                  </span>
                )}
              </div>

              {/* Card Footer Buttons: 详情 & 习题 */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {poem.lines?.length || 4} 句 / {questionCount} 题
                </span>
                <div className="flex items-center gap-1.5">
                  {/* 1. 详情 Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPoem(poem);
                      setActiveModalPoem(poem);
                    }}
                    className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="查看古诗全文、拼音、译文与意境"
                  >
                    <span>📖</span>
                    <span>详情</span>
                  </button>

                  {/* 2. 习题 Button */}
                  <button
                    type="button"
                    disabled={!isLearnt}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLearnt) return;
                      if (questionCount > 0) {
                        setActiveQuizPreviewPoem(poem);
                      } else {
                        alert(`《${poem.title}》暂无配套习题`);
                      }
                    }}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs ${
                      isLearnt
                        ? 'bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 border border-indigo-200/80 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-50 cursor-not-allowed'
                    }`}
                    title={isLearnt ? '免计分预览自测全部题目' : '此古诗尚未解锁（未学），请联系教师解锁后练习'}
                  >
                    <span>📝</span>
                    <span>习题</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal (拓展自学 / 诗句详情) */}
      {activeModalPoem && (
        <PoemStudyDetailModal
          poem={activeModalPoem}
          isLearnt={learntPoemIds.map(Number).includes(Number(activeModalPoem.id))}
          onClose={() => setActiveModalPoem(null)}
        />
      )}

      {/* Questions Preview Modal (习题预览, 免成绩提交) */}
      {activeQuizPreviewPoem && (
        <StudentQuizPreviewModal
          poemTitle={activeQuizPreviewPoem.title}
          questions={activeQuizPreviewPoem.questions || []}
          initialIndex={0}
          isPurePreview={true}
          onClose={() => setActiveQuizPreviewPoem(null)}
        />
      )}
    </div>
  );
};

export default StudentSelfStudyTab;

