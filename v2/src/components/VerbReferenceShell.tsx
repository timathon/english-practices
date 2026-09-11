import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePracticeAudio, getAudioUrl, getWordAudioUrl } from '../lib/practiceAudio'
import './VerbReferenceShell.css'

interface VerbExample {
    sentence: string;
    cn: string;
    unit: string;
    detail: string;
}

interface IrregularVerbItem {
    id: string;
    base: string;
    past: string;
    past_participle?: string;
    ipa?: string;
    meaning: string;
    category?: string;
    examples?: VerbExample[];
}

interface VerbExpressionItem {
    id: string;
    expression: string;
    verb_base: string;
    category?: string;
    structure?: string;
    meaning: string;
    examples?: VerbExample[];
}

export function VerbReferenceShell({ data, textbook, unit }: any) {
    const isIrregular = data?.type === 'irregular-verbs' || Boolean(data?.verbs);
    const items: (IrregularVerbItem | VerbExpressionItem)[] = isIrregular ? (data?.verbs || []) : (data?.expressions || []);

    // Primary school (Grade 3-6, A3-A6, etc.) only learns past tense; past participle is hidden
    const tbUpper = (textbook || data?.level || '').toUpperCase();
    const isPrimary = /^A[3-6]/i.test(tbUpper) || /GRADE [3-6]/i.test(tbUpper);
    const showOnlyPast = isPrimary;

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedUnit, setSelectedUnit] = useState<string>('All')
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [showScrollTop, setShowScrollTop] = useState(false)
    const [showTypeHelpModal, setShowTypeHelpModal] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true)
            } else {
                setShowScrollTop(false)
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (showTypeHelpModal) {
            const originalOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = originalOverflow
            }
        }
    }, [showTypeHelpModal])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const { playAudio } = usePracticeAudio(textbook || 'A6A')

    // Collect all available units from example sentences
    const availableUnits = useMemo(() => {
        const uSet = new Set<string>()
        items.forEach((it: any) => {
            (it.examples || []).forEach((ex: VerbExample) => {
                if (ex.unit) uSet.add(ex.unit)
            })
        })
        const sorted = Array.from(uSet).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0
            const numB = parseInt(b.replace(/\D/g, '')) || 0
            return numA - numB
        })
        return ['All', ...sorted]
    }, [items])

    // Helper to format/simplify category (e.g. A-B-B / A-B-C -> A-B when past participle is omitted)
    const getDisplayCategory = (cat?: string) => {
        if (!cat) return '';
        if (showOnlyPast) {
            return cat
                .replace(/^A-A-A/i, 'A-A')
                .replace(/^A-B-B/i, 'A-B')
                .replace(/^A-B-C/i, 'A-B')
                .replace(/^A-B-A/i, 'A-B');
        }
        return cat;
    };

    // Collect all available categories
    const availableCategories = useMemo(() => {
        const cSet = new Set<string>()
        items.forEach((it: any) => {
            const c = getDisplayCategory(it.category);
            if (c) cSet.add(c)
        })
        return ['All', ...Array.from(cSet).sort()]
    }, [items, showOnlyPast])

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter((item: any) => {
            // Category filter
            const dispCat = getDisplayCategory(item.category);
            if (selectedCategory !== 'All' && dispCat !== selectedCategory) {
                return false
            }

            // Unit filter
            if (selectedUnit !== 'All') {
                const hasUnit = (item.examples || []).some((ex: VerbExample) => ex.unit === selectedUnit)
                if (!hasUnit) return false
            }

            // Query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchesText = isIrregular
                    ? (item.base?.toLowerCase().includes(q) ||
                       item.past?.toLowerCase().includes(q) ||
                       (!showOnlyPast && item.past_participle?.toLowerCase().includes(q)) ||
                       item.meaning?.toLowerCase().includes(q))
                    : (item.expression?.toLowerCase().includes(q) ||
                       item.verb_base?.toLowerCase().includes(q) ||
                       item.meaning?.toLowerCase().includes(q) ||
                       item.structure?.toLowerCase().includes(q))

                const matchesExamples = (item.examples || []).some((ex: VerbExample) =>
                    ex.sentence.toLowerCase().includes(q) || ex.cn.toLowerCase().includes(q)
                )

                if (!matchesText && !matchesExamples) return false
            }

            return true
        })
    }, [items, isIrregular, selectedCategory, selectedUnit, searchQuery, showOnlyPast])

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAllExpand = () => {
        if (expandedIds.size > 0) {
            setExpandedIds(new Set())
        } else {
            setExpandedIds(new Set(filteredItems.map(it => it.id)))
        }
    }

    const handlePlayWord = (e: React.MouseEvent, word: string) => {
        e.stopPropagation()
        const url = getWordAudioUrl(word, textbook || 'a6a')
        playAudio(url)
    }

    const handlePlaySentence = (e: React.MouseEvent, sentence: string) => {
        e.stopPropagation()
        const url = getAudioUrl(sentence, textbook || 'a6a')
        playAudio(url)
    }

    // Helper to highlight verb / expression words in example sentence
    const renderHighlightedSentence = (sentence: string, item: any, isIrreg: boolean) => {
        if (!sentence) return sentence;

        const wordsToMatch = new Set<string>();

        // Helper to generate common inflections for a regular/irregular base verb
        const addVerbInflections = (verb: string) => {
            if (!verb || verb.length < 2) return;
            const v = verb.toLowerCase().trim();
            wordsToMatch.add(v);

            if (v === 'be') {
                ['am', 'is', 'are', 'was', 'were', 'being', 'been'].forEach(w => wordsToMatch.add(w));
                return;
            }
            if (v === 'have') {
                ['has', 'had', 'having'].forEach(w => wordsToMatch.add(w));
                return;
            }
            if (v === 'do') {
                ['does', 'did', 'done', 'doing'].forEach(w => wordsToMatch.add(w));
                return;
            }
            if (v === 'go') {
                ['goes', 'went', 'gone', 'going'].forEach(w => wordsToMatch.add(w));
                return;
            }

            // Standard -s / -es 3rd person singular
            if (v.endsWith('ch') || v.endsWith('sh') || v.endsWith('ss') || v.endsWith('x') || v.endsWith('o')) {
                wordsToMatch.add(v + 'es');
            } else if (v.endsWith('y') && !/[aeiou]y$/i.test(v)) {
                wordsToMatch.add(v.slice(0, -1) + 'ies');
            } else {
                wordsToMatch.add(v + 's');
            }

            // -ing participle
            if (v.endsWith('ie')) {
                wordsToMatch.add(v.slice(0, -2) + 'ying');
            } else if (v.endsWith('e') && !v.endsWith('ee')) {
                wordsToMatch.add(v.slice(0, -1) + 'ing');
            } else {
                wordsToMatch.add(v + 'ing');
            }

            // -ed past tense
            if (v.endsWith('e')) {
                wordsToMatch.add(v + 'd');
            } else if (v.endsWith('y') && !/[aeiou]y$/i.test(v)) {
                wordsToMatch.add(v.slice(0, -1) + 'ied');
            } else {
                wordsToMatch.add(v + 'ed');
            }
        };

        if (isIrreg) {
            // Base form
            if (item.base) {
                addVerbInflections(item.base);
            }
            // Past forms (could be slash separated e.g. was/were, learnt/learned)
            if (item.past) {
                item.past.split(/[/,]/).forEach((p: string) => {
                    const clean = p.trim();
                    if (clean) {
                        wordsToMatch.add(clean);
                        addVerbInflections(clean);
                    }
                });
            }
            // Past participle
            if (item.past_participle) {
                item.past_participle.split(/[/,]/).forEach((pp: string) => {
                    const clean = pp.trim();
                    if (clean) {
                        wordsToMatch.add(clean);
                        addVerbInflections(clean);
                    }
                });
            }
        } else {
            // Verb expression: e.g. "spend ... on", "give up", "be good at"
            if (item.verb_base) {
                addVerbInflections(item.verb_base);
            }
            if (item.expression) {
                // Split expression into individual words, strip dots/slashes/parens
                const tokens = item.expression
                    .replace(/\.\.\./g, ' ')
                    .replace(/[/()~_]/g, ' ')
                    .split(/\s+/)
                    .map((t: string) => t.trim())
                    .filter((t: string) => t.length > 0 && !['sb', 'sth', 'oneself', 'somebody', 'something'].includes(t.toLowerCase()));
                
                tokens.forEach((t: string, idx: number) => {
                    wordsToMatch.add(t);
                    // The first token of an expression is usually the main verb
                    if (idx === 0) {
                        addVerbInflections(t);
                    }
                });
            }
        }

        const validTokens = Array.from(wordsToMatch).filter(w => w.length > 0);
        if (validTokens.length === 0) return sentence;

        // Escape regex tokens and sort by length descending to match longest phrases first
        const escaped = validTokens
            .sort((a, b) => b.length - a.length)
            .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

        const parts = sentence.split(regex);
        return parts.map((part, i) => {
            const isMatch = validTokens.some(tok => tok.toLowerCase() === part.toLowerCase());
            if (isMatch) {
                return <span key={i} className="verb-sentence-highlight">{part}</span>;
            }
            return part;
        });
    };

    // Group irregular verbs by their earliest unit for test sheet printout
    const groupedVerbsByUnit = useMemo(() => {
        if (!isIrregular) return [];
        const unitMap: { [unit: string]: IrregularVerbItem[] } = {};
        
        (items as IrregularVerbItem[]).forEach((item) => {
            const itemUnits = (item.examples || [])
                .map(ex => ex.unit)
                .filter(Boolean);
            
            // Find earliest unit by unit number, or fallback to 'General'
            let primaryUnit = 'General';
            if (itemUnits.length > 0) {
                const sortedItemUnits = [...itemUnits].sort((a, b) => {
                    const numA = parseInt(a.replace(/\D/g, '')) || 999;
                    const numB = parseInt(b.replace(/\D/g, '')) || 999;
                    return numA - numB;
                });
                primaryUnit = sortedItemUnits[0];
            }
            if (!unitMap[primaryUnit]) {
                unitMap[primaryUnit] = [];
            }
            unitMap[primaryUnit].push(item);
        });

        return Object.keys(unitMap).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 999;
            const numB = parseInt(b.replace(/\D/g, '')) || 999;
            return numA - numB;
        }).map(u => ({
            unit: u,
            verbs: unitMap[u]
        }));
    }, [items, isIrregular]);

    const totalIrregularCount = items.length;

    return (
        <div className="verb-ref-container">
            {/* Header */}
            <div className="verb-ref-header">
                <div className="verb-ref-nav">
                    <Link to="/" className="verb-ref-back">‹ 返回目录</Link>
                    <span className="verb-ref-badge">{data?.level || `${textbook} - ${unit}`}</span>
                </div>
                <div className="verb-ref-title-row">
                    <h1 className="verb-ref-title">
                        {isIrregular ? '⚡ 不规则动词表 (Irregular Verbs)' : '💡 动词短语与搭配 (Verb Expressions)'}
                    </h1>
                    {isIrregular && (
                        <button
                            className="verb-ref-print-btn"
                            onClick={() => window.print()}
                            title="打印动词过去式测试卷"
                        >
                            🖨️ 打印测试卷
                        </button>
                    )}
                </div>
                <p className="verb-ref-subtitle">
                    {isIrregular
                        ? '汇总全书核心不规则动词变化形式、标准英音发音与教材课文例句。'
                        : '汇总全书高频动词短语、固定句型与教材地道例句。'}
                </p>
            </div>

            {/* Filter Bar */}
            <div className="verb-ref-controls">
                <div className="verb-ref-search-wrap">
                    <span className="verb-ref-search-icon">🔍</span>
                    <input
                        type="text"
                        className="verb-ref-search-input"
                        placeholder={isIrregular ? "搜索动词原形、过去式或中文..." : "搜索动词短语、句型或中文..."}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="verb-ref-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>

                <div className="verb-ref-filter-row">
                    {/* Unit Filter */}
                    <div className="verb-ref-filter-group">
                        <span className="verb-ref-filter-label">单元过滤:</span>
                        <div className="verb-ref-chips">
                            {availableUnits.map(u => (
                                <button
                                    key={u}
                                    className={`verb-ref-chip ${selectedUnit === u ? 'active' : ''}`}
                                    onClick={() => setSelectedUnit(u)}
                                >
                                    {u === 'All' ? '全部单元' : u}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Filter */}
                    {availableCategories.length > 2 && (
                        <div className="verb-ref-filter-group">
                            <span className="verb-ref-filter-label">
                                类型分类:
                                <button
                                    className="verb-ref-help-icon"
                                    onClick={() => setShowTypeHelpModal(true)}
                                    title="查看分类说明"
                                    aria-label="查看分类说明"
                                >
                                    ?
                                </button>
                            </span>
                            <div className="verb-ref-chips">
                                {availableCategories.map(c => (
                                    <button
                                        key={c}
                                        className={`verb-ref-chip ${selectedCategory === c ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(c)}
                                    >
                                        {c === 'All' ? '全部分类' : c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats & Actions */}
                <div className="verb-ref-stats-bar">
                    <span>共找到 <strong>{filteredItems.length}</strong> 条记录</span>
                    <button
                        className={`verb-ref-toggle-all-btn ${expandedIds.size > 0 ? 'expanded' : 'collapsed'}`}
                        onClick={toggleAllExpand}
                    >
                        {expandedIds.size > 0 ? '收起所有例句' : '展开所有例句'}
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="verb-ref-list">
                {filteredItems.length === 0 ? (
                    <div className="verb-ref-empty">
                        <p>没有匹配的动词或短语记录</p>
                    </div>
                ) : (
                    filteredItems.map((item: any, idx: number) => {
                        const isExpanded = expandedIds.has(item.id)
                        const examples = item.examples || []

                        return (
                            <div
                                key={item.id || idx}
                                className={`verb-ref-card ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleExpand(item.id)}
                            >
                                <div className="verb-ref-card-main">
                                    <div className="verb-ref-card-left">
                                        <div className="verb-ref-card-header-row">
                                            {isIrregular ? (
                                                <div className="verb-ref-forms">
                                                    <span className="verb-base">{item.base}</span>
                                                    <span className="verb-arrow">→</span>
                                                    <span className="verb-past">{item.past}</span>
                                                    {!showOnlyPast && item.past_participle && (
                                                        <>
                                                            <span className="verb-arrow">→</span>
                                                            <span className="verb-pp">{item.past_participle}</span>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="verb-expression-title">
                                                    <span className="verb-expr-text">{item.expression}</span>
                                                </div>
                                            )}

                                            {isIrregular && (
                                                <button
                                                    className="verb-ref-audio-btn"
                                                    title="发音"
                                                    onClick={(e) => handlePlayWord(e, item.base)}
                                                >
                                                    🔊
                                                </button>
                                            )}

                                            {item.category && (
                                                <span className="verb-category-tag">{getDisplayCategory(item.category)}</span>
                                            )}
                                        </div>

                                        <div className="verb-ref-info-row">
                                            {isIrregular && item.ipa && (
                                                <span className="verb-ipa">{item.ipa}</span>
                                            )}

                                            {!isIrregular && item.structure && (
                                                <span className="verb-structure">
                                                    <code>{item.structure}</code>
                                                </span>
                                            )}

                                            <span className="verb-meaning">{item.meaning}</span>
                                        </div>
                                    </div>

                                    <div className="verb-ref-card-right">
                                        {examples.length > 0 && (
                                            <span className="verb-example-count-badge">
                                                {examples.length} 个教材例句 {isExpanded ? '▲' : '▼'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Expandable Examples */}
                                {isExpanded && examples.length > 0 && (
                                    <div className="verb-ref-examples-drawer" onClick={e => e.stopPropagation()}>
                                        <div className="verb-examples-title">📖 教材出处与真实例句</div>
                                        <div className="verb-examples-list">
                                            {examples.map((ex: VerbExample, exIdx: number) => (
                                                <div key={exIdx} className="verb-example-item">
                                                    <div className="verb-example-top">
                                                        <span className="verb-example-unit-tag">{ex.unit}</span>
                                                        {ex.detail && (
                                                             <span className="verb-example-detail-tag">{ex.detail}</span>
                                                        )}
                                                        <button
                                                            className="verb-example-audio-btn"
                                                            title="朗读例句"
                                                            onClick={(e) => handlePlaySentence(e, ex.sentence)}
                                                        >
                                                            🔊 朗读
                                                        </button>
                                                    </div>
                                                    <div className="verb-example-en">{renderHighlightedSentence(ex.sentence, item, isIrregular)}</div>
                                                    <div className="verb-example-cn">{ex.cn}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Back to top button */}
            {showScrollTop && (
                <button
                    className="verb-ref-back-to-top"
                    onClick={scrollToTop}
                    title="回到顶部"
                    aria-label="Back to top"
                >
                    ↑
                </button>
            )}

            {/* Type Explanation Modal */}
            {showTypeHelpModal && (
                <div className="verb-type-modal-backdrop" onClick={() => setShowTypeHelpModal(false)}>
                    <div className="verb-type-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="verb-type-modal-header">
                            <h3 className="verb-type-modal-title">
                                {isIrregular ? '💡 不规则动词分类说明' : '💡 动词短语与搭配类型说明'}
                            </h3>
                            <button
                                className="verb-type-modal-close"
                                onClick={() => setShowTypeHelpModal(false)}
                                aria-label="关闭"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="verb-type-modal-body">
                            {isIrregular ? (
                                <div className="verb-type-modal-section">
                                    <p className="verb-type-modal-intro">
                                        不规则动词的变化形式根据“原形”与“过去式”的变化规律归纳为以下几大类：
                                    </p>
                                    <div className="verb-type-items">
                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">A-A</div>
                                            <div className="verb-type-item-desc">
                                                <strong>原形与过去式完全相同</strong>
                                                <span>原形与过去式拼写完全不变。例如：<code>cut → cut</code>、<code>put → put</code>、<code>cost → cost</code>、<code>let → let</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">A-A (sound change)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>拼写相同，发音改变</strong>
                                                <span>拼写完全相同，但读音发生改变。例如：<code>read /riːd/ → read /red/</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">A-B (vowel change)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>内部元音字母改变</strong>
                                                <span>通过改变词干中间的元音字母构成过去式。例如：<code>get → got</code>、<code>run → ran</code>、<code>come → came</code>、<code>meet → met</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">A-B (ought / aught)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>词尾变为 -ought 或 -aught</strong>
                                                <span>过去式以 /ɔːt/ 音结尾。例如：<code>buy → bought</code>、<code>bring → brought</code>、<code>teach → taught</code>、<code>catch → caught</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">A-B (d-&gt;t / +d / +t)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>辅音替换或词尾加 d/t</strong>
                                                <span>结尾字母 d 变为 t，或在词尾加 d/t。例如：<code>build → built</code>、<code>spend → spent</code>、<code>hear → heard</code>、<code>learn → learnt</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">A-B (y-&gt;id / k-&gt;d)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>字母特殊置换</strong>
                                                <span>词尾 y 改为 id，或 k 改为 d。例如：<code>pay → paid</code>、<code>say → said</code>、<code>make → made</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">Special</div>
                                            <div className="verb-type-item-desc">
                                                <strong>特殊变化动词</strong>
                                                <span>变化极其特殊的动词或情态动词。例如：<code>be → was/were</code>、<code>go → went</code>、<code>have → had</code>、<code>can → could</code>。</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="verb-type-modal-section">
                                    <p className="verb-type-modal-intro">
                                        动词短语与固定搭配按英语语法结构分类如下：
                                    </p>
                                    <div className="verb-type-items">
                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">Phrasal Verb (动词短语)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>动词 + 副词 / 介词组合</strong>
                                                <span>动词与介词或副词构成整体，产生独特的独立词义。例如：<code>give up (放弃)</code>、<code>wake up (醒来)</code>、<code>turn on (打开)</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">Collocation (固定搭配)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>动词与介词 / 名词的习惯搭配</strong>
                                                <span>地道英语中习惯连用的动词搭配与表达。例如：<code>spend ... on (在...上花费)</code>、<code>be good at (擅长)</code>、<code>take care of (照顾)</code>。</span>
                                            </div>
                                        </div>

                                        <div className="verb-type-item">
                                            <div className="verb-type-item-badge">Verb Pattern (句型句式)</div>
                                            <div className="verb-type-item-desc">
                                                <strong>动词支配的固定句型</strong>
                                                <span>由特定动词引出的固定语法结构（如动名词或不定式句型）。例如：<code>tell sb. to do (告诉某人做某事)</code>、<code>want to do (想要做某事)</code>。</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="verb-type-modal-footer">
                            <button
                                className="verb-type-modal-confirm-btn"
                                onClick={() => setShowTypeHelpModal(false)}
                            >
                                我明白了
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Irregular Verbs Past Tense Test Sheet (Print only) */}
            {isIrregular && (
                <div className="verb-ref-test-sheet-print-doc">
                    <div className="verb-print-sheet-header">
                        <div className="verb-print-title-row">
                            <h1 className="verb-print-title">不规则动词过去式默写测试卷 (Irregular Verbs Past Tense Test)</h1>
                            <span className="verb-print-level">{data?.level || `${textbook} - ${unit}`}</span>
                        </div>
                        <div className="verb-print-meta-row">
                            <span className="verb-print-meta-item">姓名 (Name): <span className="verb-print-meta-line"></span></span>
                            <span className="verb-print-meta-item">班级 (Class): <span className="verb-print-meta-line"></span></span>
                            <span className="verb-print-meta-item">日期 (Date): <span className="verb-print-meta-line"></span></span>
                            <span className="verb-print-meta-item">得分 (Score): <span className="verb-print-meta-line short"></span> / {totalIrregularCount}</span>
                        </div>
                    </div>

                    <div className="verb-print-groups">
                        {groupedVerbsByUnit.map((g) => (
                            <div key={g.unit} className="verb-print-unit-section">
                                <div className="verb-print-unit-heading">
                                    <span className="verb-print-unit-title">📌 {g.unit}</span>
                                    <span className="verb-print-unit-count">共 {g.verbs.length} 词</span>
                                </div>
                                <div className="verb-print-grid">
                                    {g.verbs.map((v, idx) => (
                                        <div key={v.id || v.base} className="verb-print-item">
                                            <span className="verb-print-num">{idx + 1}.</span>
                                            <span className="verb-print-base">{v.base}</span>
                                            <span className="verb-print-meaning">({v.meaning})</span>
                                            <span className="verb-print-arrow">➔</span>
                                            <span className="verb-print-blank-line"></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
