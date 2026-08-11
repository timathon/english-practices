import React, { useState } from 'react';
import { CachedImage } from '../CachedImage';

interface StudentSelfStudyTabProps {
  poems: any[];
  learntPoemIds: any[];
  selectedPoem: any;
  onSelectPoem: (poem: any) => void;
  subject?: 'chinese' | 'math' | 'english';
}

export const StudentSelfStudyTab: React.FC<StudentSelfStudyTabProps> = ({
  poems,
  learntPoemIds,
  selectedPoem,
  onSelectPoem,
  subject = 'chinese',
}) => {
  const [showPinyin, setShowPinyin] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showImages, setShowImages] = useState(true);

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

  return (
    <div className="grid md:grid-cols-3 gap-6">

      {/* All Poems Selector */}
      {/* Mobile view: Dropdown select */}
      <div className="md:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <label className="block font-bold font-serif text-ink text-base">
          全量古诗库 ({poems.length}首)
        </label>
        <select
          value={selectedPoem?.id ?? ''}
          onChange={(e) => {
            const found = poems.find((p) => String(p.id) === e.target.value);
            if (found) onSelectPoem(found);
          }}
          className="w-full p-3 rounded-xl border border-slate-300 bg-white text-sm md:text-base font-serif text-slate-800 focus:outline-none focus:ring-2 focus:ring-jade-500"
        >
          {poems.map((poem) => {
            const isLearnt = learntPoemIds.map(Number).includes(Number(poem.id));
            return (
              <option key={poem.id} value={poem.id}>
                #{poem.id} 《{poem.title}》 - [{poem.dynasty}] {poem.author} {isLearnt ? '(已学)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Desktop view: Scrollable List */}
      <div className="hidden md:block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 max-h-[500px] overflow-y-auto">
        <h3 className="font-bold font-serif text-ink text-base">全量古诗库 ({poems.length}首)</h3>
        <div className="space-y-2">
          {poems.map((poem) => {
            const isLearnt = learntPoemIds.map(Number).includes(Number(poem.id));
            return (
              <div
                key={poem.id}
                onClick={() => onSelectPoem(poem)}
                className={`p-3 rounded-xl border cursor-pointer text-sm font-serif transition flex items-center justify-between ${
                  selectedPoem?.id === poem.id ? 'border-jade-500 bg-jade-50 font-bold shadow-xs' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <span>#{poem.id} 《{poem.title}》 - [{poem.dynasty}] {poem.author}</span>
                {isLearnt && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 font-sans font-bold rounded whitespace-nowrap">
                    已学
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra Knowledge Canvas */}
      {selectedPoem && (
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 space-y-3">
            <div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg inline-block">
                拓展自学
              </span>
            </div>

            <div className="flex justify-center py-1">
              <div className="relative">
                <h2 className="text-2xl md:text-3xl font-bold font-serif text-ink tracking-wide text-center leading-normal">
                  {selectedPoem.title}
                </h2>
                <span className="absolute left-full bottom-1 ml-3 px-2.5 py-0.5 bg-jade-100 text-jade-800 text-xs font-bold rounded-md whitespace-nowrap">
                  [{selectedPoem.dynasty}] {selectedPoem.author}
                </span>
              </div>
            </div>

            {/* 4 View Toggles: 拼音, 原文, 译文, 图片 */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPinyin(!showPinyin)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  showPinyin
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-200 text-slate-500 border-slate-300 opacity-60 hover:opacity-100'
                }`}
              >
                拼音
              </button>

              <button
                type="button"
                onClick={() => setShowOriginal(!showOriginal)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  showOriginal
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-slate-200 text-slate-500 border-slate-300 opacity-60 hover:opacity-100'
                }`}
              >
                原文
              </button>

              <button
                type="button"
                onClick={() => setShowTranslation(!showTranslation)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  showTranslation
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-slate-200 text-slate-500 border-slate-300 opacity-60 hover:opacity-100'
                }`}
              >
                译文
              </button>

              <button
                type="button"
                onClick={() => setShowImages(!showImages)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  showImages
                    ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                    : 'bg-slate-200 text-slate-500 border-slate-300 opacity-60 hover:opacity-100'
                }`}
              >
                图片
              </button>
            </div>
          </div>

          {/* Poem Text & Media Content */}
          <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100 grid grid-cols-1 lg:grid-cols-2 gap-4 text-center">
            {selectedPoem.lines.map((lineObj: any, idx: number) => {
              const text = typeof lineObj === 'string' ? lineObj : lineObj.text;
              const pinyin = typeof lineObj === 'string' ? '' : lineObj.pinyin;
              const cn = typeof lineObj === 'string' ? '' : (lineObj.cn || lineObj.meaning);
              const imgUrl = typeof lineObj === 'string' ? '' : lineObj.image;

              return (
                <div
                  key={idx}
                  className={`space-y-1.5 p-3.5 rounded-xl border text-center transition flex flex-col justify-between ${
                    idx % 2 === 1
                      ? 'bg-amber-50/70 border-amber-200/50'
                      : 'bg-white/90 border-amber-100/40'
                  }`}
                >
                  {/* Original Text with optional Pinyin */}
                  {showOriginal && (
                    <div className="text-xl font-serif font-bold text-slate-800">
                      {showPinyin && pinyin ? (
                        <ruby>{text}<rt className="text-[10px] text-amber-800 font-sans font-normal">{pinyin}</rt></ruby>
                      ) : text}
                    </div>
                  )}

                  {/* Line Translation */}
                  {showTranslation && cn && (
                    <div className="text-sm sm:text-base text-slate-700 font-medium font-sans leading-relaxed pt-0.5">{cn}</div>
                  )}

                  {/* Line Image */}
                  {showImages && imgUrl && (
                    <div className="pt-2 max-w-sm mx-auto">
                      <CachedImage
                        src={imgUrl}
                        alt={`line-${idx}`}
                        className="rounded-xl border border-amber-200 shadow-sm mx-auto object-cover max-h-48"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Extra Knowledge Sections */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-ink text-base font-bold block font-serif">📖 诗人背景故事</strong>
              <p className="text-slate-700 text-sm leading-relaxed">
                {selectedPoem.author}是{selectedPoem.dynasty}代著名诗人，其诗风通俗易懂，深受百姓喜爱。作品充满童真与生活气息。
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-ink text-base font-bold block font-serif">💡 诗词赏析与意境</strong>
              <p className="text-slate-700 text-sm leading-relaxed">
                主题：{selectedPoem.theme}。关键词包括: {selectedPoem.keywords?.join(', ')}。展现了自然景象与生动的画面感。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSelfStudyTab;
