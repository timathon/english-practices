import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePracticeAudio, getWordAudioUrl, getAudioUrl } from '../lib/practiceAudio'
import './VocabMagicianShell.css'

interface WordItem {
    word: string;
    pos?: string;
    meaning: string;
    morphology_breakdown?: string;
    example?: {
        en: string;
        cn: string;
    };
}

interface AffixItem {
    id: string;
    affix: string;
    meaning: string;
    rule?: string;
    words: WordItem[];
}

interface AffixGroup {
    category_id: string;
    category_name: string;
    items: AffixItem[];
}

interface VocabMagicianData {
    type: 'prefix' | 'suffix' | 'root';
    title: string;
    description?: string;
    total_words: number;
    groups: AffixGroup[];
}

interface VocabMagicianShellProps {
    data: VocabMagicianData;
    practiceId?: string;
    textbook?: string;
    unit?: string;
}

export function VocabMagicianShell({ data, textbook }: VocabMagicianShellProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('All')
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set())
    const [showExamples, setShowExamples] = useState(true)
    const [showScrollTop, setShowScrollTop] = useState(false)

    const { playAudio } = usePracticeAudio(textbook || 'A10')

    const groups = useMemo(() => data?.groups || [], [data])

    // Initialize all groups open by default
    useEffect(() => {
        if (groups.length > 0) {
            setExpandedGroupIds(new Set(groups.map(g => g.category_id)))
            // Open the first 3 items in each group by default
            const initialItemIds = new Set<string>()
            groups.forEach(g => {
                g.items.slice(0, 3).forEach(it => initialItemIds.add(it.id))
            })
            setExpandedItemIds(initialItemIds)
        }
    }, [groups])

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const toggleGroup = (groupId: string) => {
        setExpandedGroupIds(prev => {
            const next = new Set(prev)
            if (next.has(groupId)) next.delete(groupId)
            else next.add(groupId)
            return next
        })
    }

    const toggleItem = (itemId: string) => {
        setExpandedItemIds(prev => {
            const next = new Set(prev)
            if (next.has(itemId)) next.delete(itemId)
            else next.add(itemId)
            return next
        })
    }

    const expandAll = () => {
        setExpandedGroupIds(new Set(groups.map(g => g.category_id)))
        const allItemIds = new Set<string>()
        groups.forEach(g => g.items.forEach(it => allItemIds.add(it.id)))
        setExpandedItemIds(allItemIds)
    }

    const collapseAll = () => {
        setExpandedGroupIds(new Set())
        setExpandedItemIds(new Set())
    }

    // Filter groups and items
    const filteredGroups = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return groups
            .filter(g => activeCategory === 'All' || g.category_id === activeCategory)
            .map(g => {
                const filteredItems = g.items
                    .map(it => {
                        if (!q) return it
                        const matchAffix = it.affix.toLowerCase().includes(q) || it.meaning.toLowerCase().includes(q)
                        const matchingWords = it.words.filter(w =>
                            w.word.toLowerCase().includes(q) ||
                            w.meaning.toLowerCase().includes(q) ||
                            (w.morphology_breakdown && w.morphology_breakdown.toLowerCase().includes(q)) ||
                            (w.example?.en && w.example.en.toLowerCase().includes(q)) ||
                            (w.example?.cn && w.example.cn.toLowerCase().includes(q))
                        )
                        if (matchAffix) return it
                        if (matchingWords.length > 0) {
                            return { ...it, words: matchingWords }
                        }
                        return null
                    })
                    .filter((it): it is AffixItem => it !== null)

                return {
                    ...g,
                    items: filteredItems
                }
            })
            .filter(g => g.items.length > 0)
    }, [groups, activeCategory, searchQuery])

    const totalFilteredWords = useMemo(() => {
        return filteredGroups.reduce((acc, g) => acc + g.items.reduce((sum, it) => sum + it.words.length, 0), 0)
    }, [filteredGroups])

    const handlePlayWord = (e: React.MouseEvent, word: string) => {
        e.stopPropagation()
        const url = getWordAudioUrl(word, textbook || 'A10')
        playAudio(url)
    }

    const handlePlaySentence = (e: React.MouseEvent, sentence: string) => {
        e.stopPropagation()
        const url = getAudioUrl(sentence, textbook || 'A10')
        playAudio(url)
    }

    return (
        <div className="vm-container">
            {/* Header */}
            <header className="vm-header">
                <div className="vm-nav">
                    <Link to="/dashboard" className="vm-back">
                        ← 返回总览 (Dashboard)
                    </Link>
                    <span className="vm-badge">
                        {data?.type?.toUpperCase() || 'VOCAB MAGICIAN'} · {totalFilteredWords} 词
                    </span>
                </div>
                <div className="vm-title-row">
                    <h1 className="vm-title">
                        <span>🪄</span> {data?.title || 'Vocab Magician'}
                    </h1>
                </div>
                {data?.description && <p className="vm-desc">{data.description}</p>}
            </header>

            {/* Controls */}
            <div className="vm-controls">
                <div className="vm-search-row">
                    <input
                        type="text"
                        placeholder="🔍 搜索词根/词缀、单词、中文释义或例句..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="vm-search-input"
                    />
                </div>

                <div className="vm-actions-row">
                    {/* Category Filter */}
                    <div className="vm-filter-pills">
                        <button
                            className={`vm-filter-btn ${activeCategory === 'All' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('All')}
                        >
                            全部 ({data?.total_words || 0})
                        </button>
                        {groups.map(g => (
                            <button
                                key={g.category_id}
                                className={`vm-filter-btn ${activeCategory === g.category_id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(g.category_id)}
                            >
                                {g.category_name}
                            </button>
                        ))}
                    </div>

                    {/* Expand/Collapse & Toggle Options */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            className="vm-toggle-btn"
                            onClick={() => setShowExamples(prev => !prev)}
                            title="切换例句显示"
                        >
                            {showExamples ? '📖 隐藏例句' : '📖 显示例句'}
                        </button>
                        <button className="vm-toggle-btn" onClick={expandAll} title="全部展开">
                            📂 全部展开
                        </button>
                        <button className="vm-toggle-btn" onClick={collapseAll} title="全部收起">
                            📁 全部收起
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Groups */}
            {filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    未找到匹配的词汇或词根词缀条目
                </div>
            ) : (
                filteredGroups.map(group => {
                    const isGroupOpen = expandedGroupIds.has(group.category_id)
                    const groupWordCount = group.items.reduce((acc, it) => acc + it.words.length, 0)

                    return (
                        <div key={group.category_id} className="vm-group">
                            <div className="vm-group-header" onClick={() => toggleGroup(group.category_id)}>
                                <div className="vm-group-title">
                                    <span className={`vm-chevron ${isGroupOpen ? 'open' : ''}`}>▶</span>
                                    <span>{group.category_name}</span>
                                    <span className="vm-group-count">{groupWordCount} 词</span>
                                </div>
                                <span style={{ fontSize: 13, color: '#64748b' }}>
                                    {group.items.length} 个核心构词
                                </span>
                            </div>

                            {isGroupOpen && (
                                <div className="vm-group-body">
                                    {group.items.map(item => {
                                        const isItemOpen = expandedItemIds.has(item.id)

                                        return (
                                            <div key={item.id} className="vm-item">
                                                <div className="vm-item-header" onClick={() => toggleItem(item.id)}>
                                                    <div className="vm-item-main">
                                                        <div>
                                                            <span className="vm-affix-badge">{item.affix}</span>
                                                            <span className="vm-affix-meaning">{item.meaning}</span>
                                                        </div>
                                                        {item.rule && (
                                                            <div className="vm-item-rule">
                                                                {item.rule.replace(/\*\*/g, '')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="vm-item-words-badge">
                                                        <span>{item.words.length} 词</span>
                                                        <span className={`vm-chevron ${isItemOpen ? 'open' : ''}`}>▶</span>
                                                    </div>
                                                </div>

                                                {isItemOpen && (
                                                    <div className="vm-words-grid">
                                                        {item.words.map(w => (
                                                            <div key={w.word} className="vm-word-card">
                                                                <div className="vm-word-top">
                                                                    <div className="vm-word-title">
                                                                        <span>{w.word}</span>
                                                                        {w.pos && <span className="vm-pos-tag">{w.pos}</span>}
                                                                    </div>
                                                                    <button
                                                                        className="vm-audio-btn"
                                                                        onClick={e => handlePlayWord(e, w.word)}
                                                                        title="播放单词发音"
                                                                    >
                                                                        🔊
                                                                    </button>
                                                                </div>

                                                                <div className="vm-word-meaning">{w.meaning}</div>

                                                                {w.morphology_breakdown && (
                                                                    <div className="vm-breakdown">
                                                                        🧩 {w.morphology_breakdown}
                                                                    </div>
                                                                )}

                                                                {showExamples && w.example?.en && (
                                                                    <div className="vm-example-box">
                                                                        <div className="vm-example-en">
                                                                            <button
                                                                                className="vm-audio-btn"
                                                                                style={{ display: 'inline', marginRight: 4 }}
                                                                                onClick={e => handlePlaySentence(e, w.example!.en)}
                                                                                title="播放例句发音"
                                                                            >
                                                                                🔈
                                                                            </button>
                                                                            {w.example.en}
                                                                        </div>
                                                                        {w.example.cn && (
                                                                            <div className="vm-example-cn">{w.example.cn}</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })
            )}

            {/* Back to Top */}
            {showScrollTop && (
                <button
                    className="vm-scroll-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    title="回到顶部"
                >
                    ↑
                </button>
            )}
        </div>
    )
}
