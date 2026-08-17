import React, { useState, useEffect, useCallback } from 'react';
import { apiService, canEditQuizLibrary, Poem, PoemQuestion, IdiomGroup, IdiomQuestion } from '../services/api';
import { StudentQuizPreviewModal } from '../components/StudentQuizPreviewModal';
import { ALL_TYPES, IDIOM_TYPES, makeBlankQuestion, makeBlankIdiomQuestion } from '../components/editor/editorConstants';
import { ImageLightbox } from '../components/editor/EditorWidgets';
import { PoemEditorWorkspace } from '../components/editor/PoemEditorWorkspace';
import { IdiomEditorWorkspace } from '../components/editor/IdiomEditorWorkspace';

interface PlatformQuestionEditorProps {
  user: any;
}

export const PlatformQuestionEditor: React.FC<PlatformQuestionEditorProps> = ({ user }) => {
  if (!user || !canEditQuizLibrary(user)) {
    return null;
  }

  // Poems state
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<PoemQuestion[]>([]);
  const [activeQId, setActiveQId] = useState<string | null>(null);

  // Idioms state
  const [idiomGroups, setIdiomGroups] = useState<IdiomGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [idiomQuestions, setIdiomQuestions] = useState<IdiomQuestion[]>([]);
  const [activeIdiomQId, setActiveIdiomQId] = useState<string | null>(null);
  const [idiomAddType, setIdiomAddType] = useState<string>(IDIOM_TYPES[0]);

  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [addType, setAddType] = useState<string>(ALL_TYPES[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [previewStartIndex, setPreviewStartIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('list');
  const [selectedSubject, setSelectedSubject] = useState<string>('语文');
  const [selectedSection, setSelectedSection] = useState<string>('古诗');

  const selectPoem = useCallback((poem: Poem, allPoems?: Poem[]) => {
    setSelectedPoemId(poem.id);
    const source = allPoems ?? poems;
    const found = source.find(p => p.id === poem.id);
    const qs = found?.questions ?? [];
    setQuestions(qs);
    setActiveQId(qs.length > 0 ? qs[0].id : null);
    setDirty(false);
    setMobileTab('list');
  }, [poems]);

  const selectIdiomGroup = useCallback((group: IdiomGroup, allGroups?: IdiomGroup[]) => {
    setSelectedGroupId(group.id);
    const source = allGroups ?? idiomGroups;
    const found = source.find(g => g.id === group.id);
    const qs = found?.questions ?? [];
    setIdiomQuestions(qs);
    setActiveIdiomQId(qs.length > 0 ? qs[0].id : null);
    setDirty(false);
    setMobileTab('list');
  }, [idiomGroups]);

  // Load poems on mount
  useEffect(() => {
    const data = apiService.getQuizLibrary();
    setPoems(data);
    if (data.length > 0) selectPoem(data[0], data);
  }, []);

  // Load idioms when section is成语
  useEffect(() => {
    if (selectedSection === '成语' || selectedSection.includes('成语') || selectedSection.includes('900')) {
      apiService.getIdiomGroups().then(groups => {
        setIdiomGroups(groups);
        if (groups.length > 0 && selectedGroupId === null) {
          selectIdiomGroup(groups[0], groups);
        }
      });
    }
  }, [selectedSection]);

  const selectedPoem = poems.find(p => p.id === selectedPoemId) ?? null;
  const selectedIdiomGroup = idiomGroups.find(g => g.id === selectedGroupId) ?? null;

  const updateQuestion = (updated: PoemQuestion) => {
    setQuestions(qs => qs.map(q => q.id === updated.id ? updated : q));
    setDirty(true);
  };

  const updateIdiomQuestion = (updated: IdiomQuestion) => {
    setIdiomQuestions(qs => qs.map(q => q.id === updated.id ? updated : q));
    setDirty(true);
  };

  const addQuestion = () => {
    const blank = makeBlankQuestion(addType);
    setQuestions(qs => [...qs, blank]);
    setActiveQId(blank.id);
    setDirty(true);
  };

  const addIdiomQuestion = () => {
    const blank = makeBlankIdiomQuestion(idiomAddType);
    setIdiomQuestions(qs => [...qs, blank]);
    setActiveIdiomQId(blank.id);
    setDirty(true);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(qs => {
      const remaining = qs.filter(q => q.id !== id);
      setActiveQId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
    setConfirmDeleteId(null);
    setDirty(true);
  };

  const deleteIdiomQuestion = (id: string) => {
    setIdiomQuestions(qs => {
      const remaining = qs.filter(q => q.id !== id);
      setActiveIdiomQId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
    setConfirmDeleteId(null);
    setDirty(true);
  };

  const save = () => {
    if (!selectedPoemId) return;
    apiService.savePoemQuestions(selectedPoemId, questions);
    setPoems(ps => ps.map(p => p.id === selectedPoemId ? { ...p, questions } : p));
    setDirty(false);
    setSuccessMsg(`《${selectedPoem?.title}》题目已保存！`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const saveIdiom = () => {
    if (!selectedGroupId) return;
    apiService.saveIdiomQuestions(selectedGroupId, idiomQuestions);
    setIdiomGroups(gs => gs.map(g => g.id === selectedGroupId ? { ...g, questions: idiomQuestions } : g));
    setDirty(false);
    setSuccessMsg(`${selectedIdiomGroup?.title} 题目已保存！`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const filteredPoems = poems.filter(p =>
    p.title.includes(searchTerm) ||
    p.author.includes(searchTerm) ||
    p.dynasty.includes(searchTerm) ||
    String(p.id).includes(searchTerm)
  );

  const filteredIdiomGroups = idiomGroups.filter(g =>
    g.title.includes(searchTerm) ||
    String(g.id).includes(searchTerm) ||
    (g.idioms && g.idioms.some(i => i.word.includes(searchTerm)))
  );

  const activeQuestion = questions.find(q => q.id === activeQId) ?? null;
  const activeIdiomQuestion = idiomQuestions.find(q => q.id === activeIdiomQId) ?? null;

  const isBaiLianGe = selectedSubject === '语文' && (selectedSection === '古诗' || selectedSection === '白莲阁' || selectedSection.includes('白莲阁') || selectedSection.includes('古诗'));
  const isIdiomModule = selectedSubject === '语文' && (selectedSection === '成语' || selectedSection.includes('成语') || selectedSection.includes('900'));
  const canEdit = canEditQuizLibrary(user);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-[120] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Editor Banner Header Card */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-teal-700/40">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-teal-900/60 border border-teal-500/40 text-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
              <span>✍️ 题库编辑中心 (Quiz Library Editor)</span>
            </div>
            <h1 className="text-3xl font-black font-serif bg-gradient-to-r from-teal-200 via-emerald-200 to-white bg-clip-text text-transparent">
              全学科题库管理
            </h1>
            <p className="text-teal-200 text-xs">
              跨学科试题全量维护：配置试题内容、校验答案解析、实时预览学生答题体验。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-800/80 border border-teal-500/30 p-3.5 rounded-xl text-xs text-teal-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className="font-bold text-teal-200 whitespace-nowrap">学科:</label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  const sub = e.target.value;
                  setSelectedSubject(sub);
                  if (sub === '语文') setSelectedSection('古诗');
                  else if (sub === '数学') setSelectedSection('数理逻辑');
                  else if (sub === '英语') setSelectedSection('语法与阅读');
                  else if (sub === '科学') setSelectedSection('自然科学');
                }}
                className="px-3 py-1.5 bg-slate-900 border border-teal-400/50 rounded-lg text-xs font-bold text-white outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
              >
                <option value="语文">语文</option>
                <option value="数学">数学</option>
                <option value="英语">英语</option>
                <option value="科学">科学</option>
              </select>
            </div>

            <div className="h-6 border-l border-teal-500/30 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-teal-200 whitespace-nowrap">分区:</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-teal-400/50 rounded-lg text-xs font-bold text-white outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
              >
                {selectedSubject === '语文' && (
                  <>
                    <option value="古诗">古诗 (白莲阁75首)</option>
                    <option value="成语">成语 (900成语接龙)</option>
                    <option value="识字">识字</option>
                    <option value="拼音">拼音</option>
                  </>
                )}
                {selectedSubject === '数学' && (
                  <>
                    <option value="数理逻辑">数理逻辑</option>
                    <option value="几何基础">几何基础</option>
                  </>
                )}
                {selectedSubject === '英语' && (
                  <>
                    <option value="语法与阅读">语法与阅读</option>
                    <option value="听力口语">听力口语</option>
                  </>
                )}
                {selectedSubject === '科学' && (
                  <>
                    <option value="自然科学">自然科学</option>
                    <option value="物理与化学">物理与化学</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {isIdiomModule ? (
        <IdiomEditorWorkspace
          idiomGroups={idiomGroups}
          filteredIdiomGroups={filteredIdiomGroups}
          selectedIdiomGroup={selectedIdiomGroup}
          selectedGroupId={selectedGroupId}
          idiomQuestions={idiomQuestions}
          activeIdiomQId={activeIdiomQId}
          activeIdiomQuestion={activeIdiomQuestion}
          searchTerm={searchTerm}
          idiomAddType={idiomAddType}
          canEdit={canEdit}
          dirty={dirty}
          mobileTab={mobileTab}
          onSearchChange={setSearchTerm}
          onSelectIdiomGroup={selectIdiomGroup}
          onIdiomAddTypeChange={setIdiomAddType}
          onAddIdiomQuestion={addIdiomQuestion}
          onSetActiveIdiomQId={setActiveIdiomQId}
          onSetMobileTab={setMobileTab}
          onSetConfirmDeleteId={setConfirmDeleteId}
          onUpdateIdiomQuestion={updateIdiomQuestion}
          onPreviewImage={setLightboxSrc}
          onPreviewQuestions={setPreviewStartIndex}
          onSaveIdiom={saveIdiom}
        />
      ) : isBaiLianGe ? (
        <PoemEditorWorkspace
          poems={poems}
          filteredPoems={filteredPoems}
          selectedPoem={selectedPoem}
          selectedPoemId={selectedPoemId}
          questions={questions}
          activeQId={activeQId}
          activeQuestion={activeQuestion}
          searchTerm={searchTerm}
          addType={addType}
          canEdit={canEdit}
          dirty={dirty}
          mobileTab={mobileTab}
          onSearchChange={setSearchTerm}
          onSelectPoem={selectPoem}
          onAddTypeChange={setAddType}
          onAddQuestion={addQuestion}
          onSetActiveQId={setActiveQId}
          onSetMobileTab={setMobileTab}
          onSetConfirmDeleteId={setConfirmDeleteId}
          onUpdateQuestion={updateQuestion}
          onPreviewImage={setLightboxSrc}
          onPreviewQuestions={setPreviewStartIndex}
          onSave={save}
        />
      ) : (
        <div className="max-w-4xl mx-auto my-8 p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-4xl shadow-inner">
            {selectedSubject === '数学' ? '📐' : selectedSubject === '英语' ? '🔤' : selectedSubject === '科学' ? '🔬' : '📖'}
          </div>
          <div className="space-y-2">
            <span className="inline-flex px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
              知新堂 • 学科题库规划中
            </span>
            <h2 className="text-2xl font-bold font-serif text-ink">
              【{selectedSubject} - {selectedSection}】题库模块建设中
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              该学科分区的题库编辑与AI智能出题模组正在开发推进中。如需测试编辑，请在上方导航中切换至【语文 - 古诗】或【语文 - 成语】。
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setSelectedSubject('语文');
                setSelectedSection('古诗');
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>🪷 切换至【语文 - 古诗】题库</span>
            </button>
            <button
              onClick={() => {
                setSelectedSubject('语文');
                setSelectedSection('成语');
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>🐉 切换至【语文 - 成语】题库</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 !mt-0 !m-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-xl font-bold text-slate-800 mb-2">删除题目？</div>
            <p className="text-sm text-slate-500 mb-5">此操作不可撤销。确认删除这道题目吗？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium cursor-pointer">取消</button>
              <button
                onClick={() => {
                  if (isIdiomModule) deleteIdiomQuestion(confirmDeleteId);
                  else deleteQuestion(confirmDeleteId);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Quiz Preview Modal */}
      {previewStartIndex !== null && (
        <StudentQuizPreviewModal
          poemTitle={isIdiomModule ? (selectedIdiomGroup?.title || '成语接龙') : (selectedPoem?.title || '古诗')}
          questions={isIdiomModule ? idiomQuestions : questions}
          initialIndex={previewStartIndex}
          onClose={() => setPreviewStartIndex(null)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
};

export default PlatformQuestionEditor;
