import React, { useState, useEffect, useRef } from 'react';
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
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}> = ({ poem, isLearnt, onClose, onPrev, onNext, hasPrev = false, hasNext = false }) => {
  useLockBodyScroll(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showPinyin, setShowPinyin] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showImages, setShowImages] = useState(true);

  // Automatically scroll content container to top when poem changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [poem?.id]);

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
          <div className="relative flex flex-col items-center justify-center">
            {/* Top row badges and close button */}
            <div className="w-full flex items-center justify-between">
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
                {poem.id && (
                  <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold rounded-full">
                    #{poem.id}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white text-2xl leading-none p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="关闭"
              >
                ✕
              </button>
            </div>

            {/* Centered Title with Prev / Next Navigation Arrows, Dynasty/Author, and Theme */}
            <div className="w-full flex items-center justify-between gap-3 mt-1">
              {/* Left Arrow (Previous Poem) */}
              <button
                type="button"
                disabled={!hasPrev}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasPrev && onPrev) onPrev();
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                  hasPrev
                    ? 'text-emerald-100 hover:text-white bg-white/15 hover:bg-emerald-500/40 border border-white/20 hover:border-emerald-400/50 active:scale-90 cursor-pointer shadow-md'
                    : 'text-white/20 bg-white/5 border border-white/5 cursor-not-allowed opacity-20'
                }`}
                title={hasPrev ? '上一首 (点击切换)' : '已是第一首'}
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Centered Title & Metadata */}
              <div className="text-center space-y-1 flex-1 px-2">
                <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-wide">
                  《{poem.title}》
                </h2>
                <div className="text-sm sm:text-base font-normal text-emerald-200 font-sans">
                  [{poem.dynasty}] {poem.author}
                </div>
                {poem.theme && (
                  <div className="text-xs text-emerald-300/80 font-sans pt-0.5">
                    主题：{poem.theme}
                  </div>
                )}
              </div>

              {/* Right Arrow (Next Poem) */}
              <button
                type="button"
                disabled={!hasNext}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasNext && onNext) onNext();
                }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                  hasNext
                    ? 'text-emerald-100 hover:text-white bg-white/15 hover:bg-emerald-500/40 border border-white/20 hover:border-emerald-400/50 active:scale-90 cursor-pointer shadow-md'
                    : 'text-white/20 bg-white/5 border border-white/5 cursor-not-allowed opacity-20'
                }`}
                title={hasNext ? '下一首 (点击切换)' : '已是最后一首'}
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 4 View Toggles: 拼音, 原文, 译文, 图片 */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4 pt-3.5 border-t border-white/10">
            {/* 1. 拼音 */}
            <button
              type="button"
              onClick={() => setShowPinyin(!showPinyin)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer border flex items-center gap-1.5 ${
                showPinyin
                  ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200 shadow-sm shadow-emerald-950/20'
                  : 'bg-white/10 border-white/15 text-white/50 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              <span>拼音</span>
            </button>

            {/* 2. 原文 */}
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer border flex items-center gap-1.5 ${
                showOriginal
                  ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200 shadow-sm shadow-emerald-950/20'
                  : 'bg-white/10 border-white/15 text-white/50 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              <span>原文</span>
            </button>

            {/* 3. 译文 */}
            <button
              type="button"
              onClick={() => setShowTranslation(!showTranslation)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer border flex items-center gap-1.5 ${
                showTranslation
                  ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200 shadow-sm shadow-emerald-950/20'
                  : 'bg-white/10 border-white/15 text-white/50 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              <span>译文</span>
            </button>

            {/* 4. 图片 */}
            <button
              type="button"
              onClick={() => setShowImages(!showImages)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer border flex items-center gap-1.5 ${
                showImages
                  ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200 shadow-sm shadow-emerald-950/20'
                  : 'bg-white/10 border-white/15 text-white/50 hover:bg-white/15 hover:text-white/80'
              }`}
            >
              <span>图片</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
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
      {activeModalPoem && (() => {
        const currentIndex = poems.findIndex((p: any) => p.id === activeModalPoem.id);
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex >= 0 && currentIndex < poems.length - 1;

        return (
          <PoemStudyDetailModal
            poem={activeModalPoem}
            isLearnt={learntPoemIds.map(Number).includes(Number(activeModalPoem.id))}
            onClose={() => setActiveModalPoem(null)}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={() => {
              if (hasPrev) {
                const prevPoem = poems[currentIndex - 1];
                onSelectPoem(prevPoem);
                setActiveModalPoem(prevPoem);
              }
            }}
            onNext={() => {
              if (hasNext) {
                const nextPoem = poems[currentIndex + 1];
                onSelectPoem(nextPoem);
                setActiveModalPoem(nextPoem);
              }
            }}
          />
        );
      })()}

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

