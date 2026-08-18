import React, { useState, useEffect } from 'react';
import { CachedImage } from '../CachedImage';
import { apiService } from '../../services/api';

interface HistoryDetailModalProps {
  selectedHistoryItem: any;
  poems: any[];
  formatLocalTime: (isoStr: string) => string;
  onClose: () => void;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  selectedHistoryItem,
  poems,
  formatLocalTime,
  onClose,
}) => {
  const [fullItem, setFullItem] = useState<any>(selectedHistoryItem);

  useEffect(() => {
    setFullItem(selectedHistoryItem);
    if (selectedHistoryItem?.id) {
      apiService.getQuizHistoryDetail(selectedHistoryItem.id).then((res) => {
        if (res && res.details) {
          setFullItem(res);
        }
      });
    }
  }, [selectedHistoryItem]);

  if (!selectedHistoryItem) return null;
  const currentRecord = fullItem || selectedHistoryItem;

  return (
    <div
      className="fixed inset-0 !mt-0 !m-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold rounded-full">
              <span>📊 答题成绩明细与解析</span>
            </div>
            <h3 className="text-xl font-bold font-serif text-white">
              《{currentRecord.poemTitle}》
            </h3>
            <div className="flex items-center gap-4 text-xs text-indigo-200/80 pt-0.5">
              <span>📅 完成时间: {formatLocalTime(currentRecord.completedAt)}</span>
              <span>🏆 得分: <strong className="text-emerald-400 font-bold font-mono text-sm">{currentRecord.score}分</strong></span>
              <span>🏷 关卡: {currentRecord.quizType}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body: List of questions with student first attempt answers & correct answers */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50">
          {(() => {
            const poem = poems.find(p => p.title === currentRecord.poemTitle) || poems.find(p => p.id === currentRecord.poemId);
            const idiomGroups = apiService.getLocalIdiomGroups();
            const idiomGroup = !poem ? idiomGroups.find(g => g.title === currentRecord.poemTitle || `成语接龙第${g.id}组` === currentRecord.poemTitle || currentRecord.poemTitle?.includes(`第${g.id}组`)) : null;
            const hasRecordedDetails = Array.isArray(currentRecord.details) && currentRecord.details.length > 0;
            const detailItems = hasRecordedDetails ? currentRecord.details : (poem?.questions || idiomGroup?.questions || []);

            if (detailItems.length === 0) {
              return (
                <div className="text-center py-10 text-slate-400 text-sm">
                  暂无试题明细数据
                </div>
              );
            }

            const typeLabels: Record<string, string> = {
              LineAssembly: '连句组装',
              VerseCloze: '诗句填空',
              PinyinMatch: '拼音辨析',
              TextToCn: '诗意理解',
              CulturalContext: '文化背景',
              ImageOrdering: '插图排序',
              ImageToLine: '图配句',
              IdiomAssembly: '成语还原',
              ChainAssembly: '接龙还原',
              IdiomSolitaire: '首尾接龙',
              IdiomCloze: '成语填空',
              HomophoneMatch: '字音字形',
              IdiomMeaning: '成语释义',
              StoryComprehension: '故事问答',
              ImageToIdiom: '看图识成语',
              EmotionMatch: '情感归类',
            };
            const typeColors: Record<string, string> = {
              LineAssembly: 'bg-violet-100 text-violet-800 border-violet-200',
              VerseCloze: 'bg-teal-100 text-teal-800 border-teal-200',
              PinyinMatch: 'bg-sky-100 text-sky-800 border-sky-200',
              TextToCn: 'bg-amber-100 text-amber-800 border-amber-200',
              CulturalContext: 'bg-rose-100 text-rose-800 border-rose-200',
              ImageOrdering: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              ImageToLine: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              IdiomAssembly: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              ChainAssembly: 'bg-amber-100 text-amber-800 border-amber-200',
              IdiomSolitaire: 'bg-indigo-100 text-indigo-800 border-indigo-200',
              IdiomCloze: 'bg-teal-100 text-teal-800 border-teal-200',
              HomophoneMatch: 'bg-sky-100 text-sky-800 border-sky-200',
              IdiomMeaning: 'bg-amber-100 text-amber-800 border-amber-200',
              StoryComprehension: 'bg-purple-100 text-purple-800 border-purple-200',
              ImageToIdiom: 'bg-teal-100 text-teal-800 border-teal-200',
              EmotionMatch: 'bg-rose-100 text-rose-800 border-rose-200',
            };

            return detailItems.map((item: any, idx: number) => {
              const qType = item.type || 'VerseCloze';
              const promptText = item.prompt || '根据古诗内容回答题目：';
              const isRecorded = hasRecordedDetails;

              return (
                <React.Fragment key={item.questionId || item.id || idx}>
                  {idx > 0 && (
                    <div className="py-3 flex items-center justify-center gap-3">
                      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-slate-400 to-transparent"></div>
                      <span className="text-xs text-slate-500 font-mono font-bold">✦</span>
                      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-slate-400 to-transparent"></div>
                    </div>
                  )}
                  <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                    {/* Question Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${typeColors[qType] || 'bg-slate-100 text-slate-700'}`}>
                          {typeLabels[qType] || qType}
                        </span>
                      </div>
                      {isRecorded && (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {item.isCorrect ? '✓ 首次作答正确' : '✕ 首次作答有误 (重练订正)'}
                        </span>
                      )}
                    </div>

                    {/* Prompt */}
                    <p className="text-sm font-bold font-serif text-slate-800 leading-relaxed">
                      {promptText}
                    </p>

                    {item.image && (
                      <div className="my-1.5 flex justify-center">
                        <CachedImage src={item.image} alt="题目图片" className="max-h-36 rounded-xl border border-slate-200 object-cover shadow-xs" />
                      </div>
                    )}

                    {/* Recorded Student Answer & Standard Answer */}
                    {isRecorded ? (
                      <div className="space-y-2">
                        <div className={`p-3 rounded-xl border text-xs font-bold space-y-1 ${item.isCorrect
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-rose-50 border-rose-300 text-rose-900'
                          }`}>
                          <span className="text-[10px] opacity-80 uppercase tracking-wide">
                            {item.isCorrect ? '✓ 您的首次回答 (正确)' : '✕ 您的首次回答 (错误)'}
                          </span>
                          <p className="text-sm font-serif">{item.userAnswerText}</p>
                        </div>

                        {!item.isCorrect && (
                          <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-xs font-bold text-emerald-900 space-y-1">
                            <span className="text-[10px] text-emerald-700 uppercase tracking-wide">✓ 标准正确答案</span>
                            <p className="text-sm font-serif">{item.correctAnswerText}</p>
                          </div>
                        )}

                        {item.explanation && (
                          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900 space-y-0.5">
                            <span className="font-bold text-amber-800">💡 试题解析：</span>
                            <p className="leading-relaxed">{item.explanation}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Fallback layout for sample/legacy items without recorded details */
                      <div className="space-y-2">
                        {qType === 'LineAssembly' && (
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">✓ 正确全句</span>
                            <p className="text-base font-serif font-bold text-emerald-900">“{item.answer}”</p>
                          </div>
                        )}

                        {qType === 'ImageOrdering' && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">✓ 正确插图发展顺序</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {(item.images || []).map((img: string, iIdx: number) => (
                                <div key={iIdx} className="bg-slate-50 p-2 border border-slate-200 rounded-xl flex flex-col items-center gap-1 text-center">
                                  <span className="text-[10px] font-bold text-indigo-600">第 {iIdx + 1} 幅</span>
                                  <CachedImage src={img} alt={`img-${iIdx}`} className="w-full h-20 object-cover rounded-lg border border-slate-100" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {qType !== 'LineAssembly' && qType !== 'ImageOrdering' && item.options && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.options.map((opt: string, oIdx: number) => {
                                const isCorrectOpt = oIdx === item.answer;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${isCorrectOpt
                                      ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900'
                                      : 'bg-slate-50 border-slate-200 text-slate-600'
                                      }`}
                                  >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrectOpt ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span className="flex-1 font-serif">{opt}</span>
                                    {isCorrectOpt && <span className="text-[10px] text-emerald-600 font-bold">✓ 正确答案</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {item.explanation && (
                              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900 space-y-0.5">
                                <span className="font-bold text-amber-800">💡 试题解析：</span>
                                <p className="leading-relaxed">{item.explanation}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            关闭明细
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryDetailModal;
