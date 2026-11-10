import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  type VocabHook, 
  getCachedHooksForWord, 
  getSelectedHookId, 
  setSelectedHookId, 
  submitVocabHook,
  fetchVocabHooks
} from '../lib/vocabHookService';
import './VocabHookSelector.css';

interface VocabHookSelectorProps {
  word: string;
  defaultHook: string;
  isLoggedIn: boolean;
  inlineDisplay?: boolean;
  onOpenModal?: () => void;
  onCloseModal?: () => void;
}

export const VocabHookSelector: React.FC<VocabHookSelectorProps> = ({
  word,
  defaultHook,
  isLoggedIn,
  inlineDisplay = true,
  onOpenModal,
  onCloseModal,
}) => {
  const [hooks, setHooks] = useState<VocabHook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHookContent, setNewHookContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const normalizedWord = (word || '').trim().toLowerCase();

  // Load hooks and selected preference
  useEffect(() => {
    if (!normalizedWord) return;
    
    // Read from cache
    setHooks(getCachedHooksForWord(normalizedWord));
    setSelectedId(getSelectedHookId(normalizedWord));

    // If logged in, ensure we fetched hooks for this word
    if (isLoggedIn) {
      fetchVocabHooks([normalizedWord]).then(res => {
        if (res[normalizedWord]) {
          setHooks(res[normalizedWord]);
        }
      });
    }

    const handleUpdate = (e: any) => {
      if (e.detail?.word === normalizedWord) {
        setHooks([...getCachedHooksForWord(normalizedWord)]);
      }
    };

    const handlePrefChange = (e: any) => {
      if (e.detail?.word === normalizedWord) {
        setSelectedId(e.detail.hookId);
      }
    };

    window.addEventListener('vocab-hooks-updated', handleUpdate);
    window.addEventListener('vocab-hook-selection-changed', handlePrefChange);

    return () => {
      window.removeEventListener('vocab-hooks-updated', handleUpdate);
      window.removeEventListener('vocab-hook-selection-changed', handlePrefChange);
    };
  }, [normalizedWord, isLoggedIn]);

  // Determine active display text
  let activeText = defaultHook || '';
  if (selectedId && selectedId !== 'default') {
    const found = hooks.find(h => h.id === selectedId);
    if (found) {
      activeText = found.content;
    }
  }

  const handleOpenModal = () => {
    setIsModalOpen(true);
    if (onOpenModal) onOpenModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onCloseModal) onCloseModal();
  };

  const handleSelectHook = (id: string | null) => {
    setSelectedHookId(normalizedWord, id);
    setSelectedId(id);
    handleCloseModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHookContent.trim()) return;
    if (newHookContent.length > 150) {
      setErrorMsg('字数不能超过 150 字');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    const res = await submitVocabHook(normalizedWord, newHookContent);
    setIsSubmitting(false);

    if (res.success) {
      setNewHookContent('');
      setHooks(getCachedHooksForWord(normalizedWord));
      setSelectedId(res.hook?.id || null);
    } else {
      setErrorMsg(res.error || '提交失败，请重试');
    }
  };

  // Total available choices = 1 (default) + community hooks
  const totalCount = 1 + hooks.length;

  return (
    <div className="vhook-container">
      {inlineDisplay && (
        <div className="vhook-main-row">
          <span className="vhook-content">{activeText || '暂无巧记'}</span>
          {isLoggedIn && (
            <button 
              type="button"
              className="vhook-badge-btn" 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal();
              }}
              title="切换或贡献记忆法"
            >
              💡 {totalCount > 1 ? `${totalCount} 种记忆法` : '添加巧记'} ▾
            </button>
          )}
        </div>
      )}

      {!inlineDisplay && isLoggedIn && (
        <button 
          type="button"
          className="vhook-badge-btn" 
          onClick={(e) => {
            e.stopPropagation();
            handleOpenModal();
          }}
          title="切换或贡献记忆法"
        >
          💡 切换巧记 ({totalCount}) ▾
        </button>
      )}

      {isModalOpen && createPortal(
        <div className="vhook-modal-overlay" onClick={handleCloseModal}>
          <div className="vhook-modal" onClick={e => e.stopPropagation()}>
            <div className="vhook-modal-header">
              <span className="vhook-modal-title">
                🧠 单词记忆法 · <span style={{ color: '#2563eb' }}>{word}</span>
              </span>
              <button 
                type="button"
                className="vhook-modal-close" 
                onClick={handleCloseModal}
              >
                &times;
              </button>
            </div>

            <div className="vhook-modal-body">
              <div className="vhook-list-label">可选记忆法 (点击选择默认展示)</div>

              {/* Official Default Hook */}
              {defaultHook && (
                <div 
                  className={`vhook-item-card ${!selectedId || selectedId === 'default' ? 'active' : ''}`}
                  onClick={() => handleSelectHook('default')}
                >
                  <div className="vhook-item-header">
                    <span className="vhook-item-tag vhook-tag-official">官方教材</span>
                    {(!selectedId || selectedId === 'default') && (
                      <span className="vhook-active-tag">✓ 当前使用</span>
                    )}
                  </div>
                  <div className="vhook-item-text">{defaultHook}</div>
                </div>
              )}

              {/* User / Community Hooks */}
              {hooks.map(h => {
                const isSelected = selectedId === h.id;
                const statusTag = h.status === 'approved' 
                  ? { label: '社区收录', cls: 'vhook-tag-community' }
                  : h.status === 'pending'
                  ? { label: '审核中 (仅自己可见)', cls: 'vhook-tag-pending' }
                  : { label: '未通过', cls: 'vhook-tag-rejected' };

                return (
                  <div 
                    key={h.id}
                    className={`vhook-item-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectHook(h.id)}
                  >
                    <div className="vhook-item-header">
                      <span className={`vhook-item-tag ${statusTag.cls}`}>{statusTag.label}</span>
                      {isSelected && <span className="vhook-active-tag">✓ 当前使用</span>}
                    </div>
                    <div className="vhook-item-text">{h.content}</div>
                  </div>
                );
              })}

              {/* Add New Hook Section */}
              <div className="vhook-add-section">
                <div className="vhook-add-title">➕ 贡献我的巧记法</div>
                <textarea
                  className="vhook-textarea"
                  placeholder="分享你的联想记忆、谐音或巧记口诀（管理员审核后将展示给所有同学）..."
                  value={newHookContent}
                  onChange={e => {
                    if (e.target.value.length <= 150) {
                      setNewHookContent(e.target.value);
                    }
                  }}
                  rows={3}
                />
                <div className="vhook-add-footer">
                  <span className="vhook-char-count">{newHookContent.length} / 150 字</span>
                  <button 
                    type="button"
                    className="vhook-submit-btn" 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !newHookContent.trim()}
                  >
                    {isSubmitting ? '提交中...' : '提交审核'}
                  </button>
                </div>
                {errorMsg && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 4 }}>
                    ⚠️ {errorMsg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
