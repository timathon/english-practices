import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShellHeader } from './shell/ShellHeader'
import './PassageClozeShell.css'
import { API_URL } from '../lib/auth'
import { decryptContent, OBSCURE_KEY } from '../lib/crypto'
import { practiceCache } from '../lib/practiceCache'

export function GrammarIndexShell({ data, practiceId, textbook, unit }: any) {
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [allPracticeQuestions, setAllPracticeQuestions] = useState<any[]>([])
    const [expandedPointId, setExpandedPointId] = useState<string | null>(null)
    const [revealedAnswers, setRevealedAnswers] = useState<{ [qId: string]: boolean }>({})
    const [showPrepositionModal, setShowPrepositionModal] = useState(false)
    const [prepositionTab, setPrepositionTab] = useState<'all_list' | 'polysemy' | 'time' | 'place' | 'movement' | 'collocation'>('all_list')

    const toggleRevealAnswer = (qId: string) => {
        setRevealedAnswers(prev => ({
            ...prev,
            [qId]: !prev[qId]
        }))
    }

    // Load related cloze practices from local client-side IndexedDB first, then network fallback
    useEffect(() => {
        let basePrefix = 'A10_a10-yp_a10-yp';
        if (practiceId && practiceId.includes('_')) {
            const parts = practiceId.split('_');
            if (parts.length >= 2) {
                basePrefix = `${parts[0]}_${parts[1]}_${parts[1]}`;
            }
        }

        // Support both 1 and 2 (e.g. a10-yp-1 and a10-yp-2)
        const candidatePracticeIds = [`${basePrefix}-1`, `${basePrefix}-2`];
        const loadedQuestionsMap: { [pid: string]: any[] } = {};

        const updateAllQuestions = () => {
            const aggregated: any[] = [];
            candidatePracticeIds.forEach(pid => {
                if (loadedQuestionsMap[pid]) {
                    aggregated.push(...loadedQuestionsMap[pid]);
                }
            });
            setAllPracticeQuestions(aggregated);
        };

        const processPracticeContent = (pid: string, content: any) => {
            if (!content?.sections) return;
            const qs: any[] = [];
            content.sections.forEach((sec: any) => {
                const rawSentences = Array.isArray(sec.raw_text) ? sec.raw_text : [];
                (sec.questions || []).forEach((q: any) => {
                    let sentenceText = q.sentence;
                    if (!sentenceText && q.sentence_index !== undefined && rawSentences[q.sentence_index]) {
                        sentenceText = rawSentences[q.sentence_index];
                    }
                    qs.push({
                        ...q,
                        sentenceText: sentenceText || `第 ${q.blank_num} 空`,
                        sectionTitle: sec.title,
                        sectionId: sec.id
                    });
                });
            });
            loadedQuestionsMap[pid] = qs;
            updateAllQuestions();
        };

        candidatePracticeIds.forEach(pid => {
            // 1. Check client-side IndexedDB cache
            practiceCache.get(pid).then(cached => {
                if (cached) {
                    processPracticeContent(pid, cached.content || cached);
                }
            });

            // 2. Network fetch fallback / sync
            fetch(`${API_URL}/api/practices/${pid}`, { credentials: 'include' })
                .then(res => res.json())
                .then(resData => {
                    if (resData && !resData.error) {
                        let content = resData.content;
                        if (resData.isEncrypted && typeof content === 'string') {
                            try {
                                content = decryptContent(content, OBSCURE_KEY);
                            } catch (e) {
                                console.error("Cloze practice decryption failed:", e);
                                return;
                            }
                        }
                        if (content) {
                            practiceCache.set(pid, resData);
                            processPracticeContent(pid, content);
                        }
                    }
                })
                .catch(err => {
                    console.warn(`Failed to load questions from ${pid}:`, err);
                });
        });
    }, [practiceId]);

    const categories = data?.categories || []

    const filteredPoints = useMemo(() => {
        let list: Array<{ categoryName: string; categoryIcon: string; point: any }> = [];
        categories.forEach((cat: any) => {
            if (activeCategory === 'all' || cat.id === activeCategory) {
                (cat.points || []).forEach((pt: any) => {
                    list.push({
                        categoryName: cat.name,
                        categoryIcon: cat.icon,
                        point: pt
                    });
                });
            }
        });
        return list;
    }, [categories, activeCategory]);

    const getRelatedQuestions = (pointId: string) => {
        return allPracticeQuestions.filter(q => q.grammar_point_id === pointId);
    };

    return (
        <div className="cloze-shell-container" style={{ '--primary': '#0284c7', '--primary-dark': '#0369a1', maxWidth: '780px' } as any}>
            <div className="cloze-screen" style={{ padding: '20px' }}>
                <ShellHeader
                    title={data?.title || '中考语篇填空考点速查与知识网络'}
                    level="Grade 10 - 中考专题"
                    textbook={textbook}
                    unit={unit}
                    prefix="cloze"
                />

                {/* Category Pill Filters (Clean wrapping badges) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '16px 0' }}>
                    <button
                        onClick={() => setActiveCategory('all')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: '1px solid ' + (activeCategory === 'all' ? 'var(--primary)' : '#e2e8f0'),
                            background: activeCategory === 'all' ? 'var(--primary)' : '#f8fafc',
                            color: activeCategory === 'all' ? '#ffffff' : '#475569',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        全部 ({categories.reduce((acc: number, c: any) => acc + (c.points?.length || 0), 0)})
                    </button>
                    {categories.map((cat: any) => {
                        const isSelected = activeCategory === cat.id;
                        const label = cat.name.replace(/^[一二三四五六七八九十]、/, '').replace(/考点/g, '');
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid ' + (isSelected ? 'var(--primary)' : '#e2e8f0'),
                                    background: isSelected ? 'var(--primary)' : '#f8fafc',
                                    color: isSelected ? '#ffffff' : '#475569',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Points Card List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, overflowY: 'auto' }}>
                    {filteredPoints.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            没有找到匹配的考点规则。
                        </div>
                    ) : (
                        filteredPoints.map(({ categoryName, categoryIcon, point }) => {
                            const relatedQs = getRelatedQuestions(point.id);
                            const isExpanded = expandedPointId === point.id;

                            return (
                                <div
                                    key={point.id}
                                    style={{
                                        background: '#f8fafc',
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: '12px',
                                        padding: '14px 16px',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{categoryIcon}</span>
                                            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>{point.name}</h4>
                                        </div>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                                            {categoryName}
                                        </span>
                                    </div>

                                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--primary)', marginBottom: '8px', fontSize: '0.92rem', lineHeight: '1.6', color: '#334155' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                            <div>
                                                <strong>💡 解题点拨：</strong>{point.rule}
                                            </div>
                                            {(point.id === 'prep_collocation' || categoryName.includes('介词')) && (
                                                <button
                                                    onClick={() => setShowPrepositionModal(true)}
                                                    style={{
                                                        flexShrink: 0,
                                                        background: '#eff6ff',
                                                        border: '1px solid #3b82f6',
                                                        color: '#1d4ed8',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    title="查看常用介词口诀、辨析与搭配汇总"
                                                >
                                                    📖 介词详解
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {point.example && (() => {
                                        const parts = point.example.split('->');
                                        const sentence = parts[0]?.trim();
                                        const answer = parts.length > 1 ? parts.slice(1).join('->').trim() : '';

                                        return (
                                            <div style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                padding: '10px 14px',
                                                marginBottom: '8px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>📖</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', letterSpacing: '0.2px' }}>典例点睛</span>
                                                </div>
                                                <div style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: '1.6', fontWeight: 500 }}>
                                                    {sentence}
                                                </div>
                                                {answer && (
                                                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>参考答案：</span>
                                                        <span style={{
                                                            background: '#ecfdf5',
                                                            color: '#059669',
                                                            border: '1px solid #a7f3d0',
                                                            padding: '2px 10px',
                                                            borderRadius: '6px',
                                                            fontWeight: 800,
                                                            fontSize: '0.9rem',
                                                            letterSpacing: '0.3px'
                                                        }}>
                                                            {answer}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Related Questions Cross-Reference */}
                                    <div style={{ marginTop: '10px' }}>
                                        <button
                                            onClick={() => setExpandedPointId(isExpanded ? null : point.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--primary)',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                padding: '4px 0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <span>{isExpanded ? '▼ 收起本单元对应真题' : `▶ 查看本单元相关真题练习 (${relatedQs.length} 题)`}</span>
                                        </button>

                                        {isExpanded && (
                                            <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid #e2e8f0' }}>
                                                {relatedQs.length === 0 ? (
                                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '6px 0' }}>
                                                        当前题库中暂无直接对应此考点的题目。
                                                    </div>
                                                ) : (
                                                    relatedQs.map((rq, rqIdx) => {
                                                        const qKey = rq.id || `${rq.sectionId}_${rq.blank_num}`;
                                                        const isAnswerRevealed = !!revealedAnswers[qKey];

                                                        return (
                                                            <div key={rqIdx} style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', marginBottom: '8px', fontSize: '0.9rem', border: '1.5px solid #e2e8f0' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', marginBottom: '6px' }}>
                                                                    <span style={{ fontWeight: 600 }}>{rq.sectionTitle} - 第 {rq.blank_num} 空</span>
                                                                    <button
                                                                        onClick={() => toggleRevealAnswer(qKey)}
                                                                        style={{
                                                                            background: isAnswerRevealed ? '#e0f2fe' : 'var(--primary)',
                                                                            color: isAnswerRevealed ? 'var(--primary-dark)' : '#ffffff',
                                                                            border: '1px solid ' + (isAnswerRevealed ? '#bae6fd' : 'var(--primary-dark)'),
                                                                            padding: '3px 10px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            boxShadow: isAnswerRevealed ? 'none' : '0 1px 3px rgba(2, 132, 199, 0.3)',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                    >
                                                                        {isAnswerRevealed ? '收起答案' : '答案'}
                                                                    </button>
                                                                </div>
                                                                <div style={{ color: '#1e293b', lineHeight: '1.6', fontWeight: 500 }}>
                                                                    {rq.sentenceText}
                                                                </div>
                                                                {isAnswerRevealed && (
                                                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                                                                        <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>
                                                                            正确答案: {rq.options ? rq.options[rq.answer] : rq.answer}
                                                                        </div>
                                                                        {rq.explanation && (
                                                                            <div style={{ color: '#475569', fontSize: '0.84rem', lineHeight: '1.5' }}>
                                                                                <strong>解析：</strong>{rq.explanation}
                                                                            </div>
                                                                        )}
                                                                        {rq.rule_summary && (
                                                                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px' }}>
                                                                                <strong>规则：</strong>{rq.rule_summary}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div style={{ marginTop: '14px', textAlign: 'center' }}>
                    <Link
                        to="/dashboard"
                        style={{
                            display: 'inline-block',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            padding: '10px 24px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.95rem'
                        }}
                    >
                        返回主面板 (Dashboard)
                    </Link>
                </div>
            </div>

            {/* Preposition Guide Modal */}
            {showPrepositionModal && (
                <div
                    className="cloze-modal-overlay"
                    onClick={() => setShowPrepositionModal(false)}
                    style={{ zIndex: 1000 }}
                >
                    <div
                        className="cloze-modal-card"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '780px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.4rem' }}>🧭</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>中考英语常见介词详解与速记辨析</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Preposition Rules &amp; Common Distinctions</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPrepositionModal(false)}
                                style={{
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    fontWeight: 700
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            {[
                                { id: 'all_list', label: '📚 常用介词全览表 (含 of / like 等)', icon: '📚' },
                                { id: 'polysemy', label: '🔥 一词多义精讲 (with / of / like / as / for)', icon: '🔥' },
                                { id: 'time', label: '⏰ 时间介词辨析 (in / on / at)', icon: '⏰' },
                                { id: 'place', label: '📍 方位地点辨析 (in / on / at)', icon: '📍' },
                                { id: 'movement', label: '🚀 空间与运动辨析', icon: '🚀' },
                                { id: 'collocation', label: '⭐ 高频固定搭配', icon: '⭐' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setPrepositionTab(tab.id as any)}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid ' + (prepositionTab === tab.id ? 'var(--primary)' : '#e2e8f0'),
                                        background: prepositionTab === tab.id ? '#eff6ff' : '#f8fafc',
                                        color: prepositionTab === tab.id ? '#1d4ed8' : '#475569',
                                        fontWeight: prepositionTab === tab.id ? 700 : 500,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '4px', fontSize: '0.92rem', lineHeight: '1.6' }}>
                            {/* TAB 0: ALL PREPOSITIONS DIRECTORY */}
                            {prepositionTab === 'all_list' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: '90px' }}>介词</th>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: '220px' }}>核心中文释义</th>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>常见搭配与例句</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { word: 'about', meanings: '关于；大约；在……周围', examples: 'talk about dreams, at about 5 o\'clock, look about / look around' },
                                                { word: 'above', meanings: '在……上方（高于，不一定正上方）', examples: 'fly above the clouds, above 30 degrees, above all (最重要的是)' },
                                                { word: 'across', meanings: '横穿/横过（平面表面）；在……对面', examples: 'swim across the river, walk across the street, across from the bank' },
                                                { word: 'after', meanings: '在……之后；在……后面', examples: 'after school, one after another, run after (追赶)' },
                                                { word: 'against', meanings: '反对；逆着；紧靠着；与……对抗', examples: 'against the wall (靠在墙上), fight against, play against Class 2' },
                                                { word: 'along', meanings: '沿着；顺着', examples: 'walk along the street / river, along with (与……一起)' },
                                                { word: 'among', meanings: '在（三者及以上）之中；在……群体中', examples: 'among the students, among the trees, popular among teenagers' },
                                                { word: 'around / round', meanings: '围绕；在……周围；到处；大约', examples: 'travel around the world, sit around the table, look around' },
                                                { word: 'as', meanings: '作为；当作；像（介词用法）', examples: 'work as a teacher (作为老师工作), regard... as... (把……当作), act as' },
                                                { word: 'at', meanings: '在（具体时刻/小地点/车站）；向/朝', examples: 'at 7:00, at school, at noon, look at, laugh at' },
                                                { word: 'before', meanings: '在……之前；在……前面', examples: 'before dinner, before 8:00, the day before yesterday' },
                                                { word: 'behind', meanings: '在……后面；落后于', examples: 'behind the door, fall behind others, the story behind the hero' },
                                                { word: 'below', meanings: '在……下方；低于', examples: 'below sea level, below 0℃, the text below' },
                                                { word: 'beside', meanings: '在……旁边（=next to）', examples: 'sit beside me, the house beside the lake' },
                                                { word: 'besides', meanings: '除……之外（还有，包含在内）', examples: 'Besides English, he also speaks French.' },
                                                { word: 'between', meanings: '在（两者）之间', examples: 'between you and me, between 8:00 and 9:00, the difference between A and B' },
                                                { word: 'by', meanings: '通过（方式）；乘（交通工具）；在……旁边；被；到……为止', examples: 'by bus, learn by heart, by the river, written by Lu Xun, by 9 o\'clock' },
                                                { word: 'during', meanings: '在……期间', examples: 'during the summer holiday, during the class' },
                                                { word: 'except', meanings: '除……之外（排除不计，不包含）', examples: 'All passed the exam except Tom. (除汤姆没过外都过了)' },
                                                { word: 'for', meanings: '为了；给/供……；持续（时间）；因为；就……而言', examples: 'for you, wait for, for 3 years, thank you for..., good for health, as for me' },
                                                { word: 'from', meanings: '从……；来自；由于；离……', examples: 'from China, come from, from A to B, prevent... from..., far from here' },
                                                { word: 'in', meanings: '在……里面；在（年/月/季）；用（语言/材料）；穿着', examples: 'in Beijing, in May, in 2024, in English, a boy in red' },
                                                { word: 'in front of', meanings: '在……前面（物体外部前方）', examples: 'stand in front of the classroom (在教室外的前面)' },
                                                { word: 'in the front of', meanings: '在……内部的前端', examples: 'stand in the front of the classroom (在教室内讲台前)' },
                                                { word: 'into', meanings: '进入……内部；变成/转化为', examples: 'walk into the room, turn water into ice, translate into Chinese' },
                                                { word: 'like', meanings: '像……一样；如同；例如（介词用法）', examples: 'He runs like the wind. (他跑得像风一样), like father like son, animals like pandas and tigers' },
                                                { word: 'of', meanings: '……的（所属）；关于；由……制成；在……之中', examples: 'a cup of tea (一杯茶), the capital of China, be proud of, think of, one of them, be made of wood' },
                                                { word: 'on', meanings: '在……上面；在（具体某天）；关于；处于……状态', examples: 'on the desk, on Monday, a book on history, on holiday, on duty' },
                                                { word: 'out of', meanings: '从……里面出来；出于；缺乏', examples: 'get out of the car, out of curiosity (出于好奇), out of work/trouble' },
                                                { word: 'over', meanings: '在……正上方（悬空）；越过；超过；关于', examples: 'a bridge over the river, jump over the fence, over 100 people (=more than)' },
                                                { word: 'since', meanings: '自……以来（常连用现在完成时）', examples: 'since 2010, since last week, have lived here since two years ago' },
                                                { word: 'through', meanings: '穿过（空间内部）；通过（手段/途径）；自始至终', examples: 'walk through the forest/tunnel, through hard work, all through the night' },
                                                { word: 'to', meanings: '到/往（方向）；给（对象）；对于；直到', examples: 'go to school, give it to him, key to the door, from morning to night' },
                                                { word: 'towards / toward', meanings: '朝……方向；向着；对于', examples: 'walk towards the station, attitude towards learning' },
                                                { word: 'under', meanings: '在……正下方；在……管理/控制下', examples: 'under the table, under the tree, under control, under 18 years old' },
                                                { word: 'until / till', meanings: '直到……为止', examples: 'wait until 5:00, not... until... (直到……才……)' },
                                                { word: 'with', meanings: '和……一起；带有/具有；用（工具）；随着；关于', examples: 'go with me, a girl with long hair, write with a pen, with the development of..., be angry with' },
                                                { word: 'without', meanings: '没有；不用；不（伴随）', examples: 'without water, leave without saying goodbye, fish cannot live without water' }
                                            ].sort((a, b) => a.word.localeCompare(b.word)).map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1d4ed8' }}>{item.word}</td>
                                                    <td style={{ padding: '8px 12px', color: '#334155' }}>{item.meanings}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span className="prep-example-code">{item.examples}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* TAB 0.5: POLYSEMY DEEP DIVE (with / of / like / as / for) */}
                            {prepositionTab === 'polysemy' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '12px 14px', borderRadius: '8px', color: '#92400e' }}>
                                        <strong>🔥 核心提示：</strong>
                                        英语介词大多是“多义词”，在不同语境和搭配中含义差异很大。以下是中考高频多义介词深度拆解：
                                    </div>

                                    {/* WITH */}
                                    <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>1. with 的 5 大核心用法</span>
                                            <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>中考最高频</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                                            <div>① <strong>伴随 / 一起</strong>（和……一起）：<span className="prep-example-code">play basketball with friends</span>, <span className="prep-example-code">live with my parents</span></div>
                                            <div>② <strong>附带 / 具有某种特征或长相</strong>（带有、长着）：<span className="prep-example-code">a boy with glasses</span>（戴眼镜的男孩）, <span className="prep-example-code">a country with a long history</span>（历史悠久的国家）</div>
                                            <div>③ <strong>使用有形工具 / 材料</strong>（用……）：<span className="prep-example-code">cut the apple with a knife</span>（用刀切苹果）, <span className="prep-example-code">write with a pencil</span></div>
                                            <div>④ <strong>随着……的变化</strong>（伴随状态）：<span className="prep-example-code">With the development of science and technology...</span>（随着科技的发展）</div>
                                            <div>⑤ <strong>固定情感与动作搭配</strong>：<span className="prep-example-code">be angry with sb.</span>（生某人的气）, <span className="prep-example-code">fall in love with</span>（爱上……）, <span className="prep-example-code">with the help of</span>（在……的帮助下）</div>
                                        </div>
                                    </div>

                                    {/* OF */}
                                    <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}>2. of 的核心用法</span>
                                            <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>所属与数量</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                                            <div>① <strong>无生命物体的所有格</strong>（……的）：<span className="prep-example-code">the capital of China</span>（中国的首都）, <span className="prep-example-code">the end of the story</span></div>
                                            <div>② <strong>数量与容器量词</strong>（……的）：<span className="prep-example-code">a cup of tea</span>（一杯茶）, <span className="prep-example-code">a pair of shoes</span>, <span className="prep-example-code">thousands of students</span></div>
                                            <div>③ <strong>整体中的一部分</strong>（在……之中）：<span className="prep-example-code">one of my friends</span>（我的一个朋友）, <span className="prep-example-code">all of us</span></div>
                                            <div>④ <strong>材料构成</strong>（看得出原材料用 of，看不出用 from）：<span className="prep-example-code">The desk is made of wood.</span> vs <span className="prep-example-code">Paper is made from wood.</span></div>
                                            <div>⑤ <strong>常见形容词/动词固定搭配</strong>：<span className="prep-example-code">be proud of</span>（为……自豪）, <span className="prep-example-code">be full of</span>（充满）, <span className="prep-example-code">think of</span>（想起/认为）, <span className="prep-example-code">instead of</span>（代替/而不是）</div>
                                        </div>
                                    </div>

                                    {/* LIKE */}
                                    <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706' }}>3. like（介词）vs as vs 动词 like</span>
                                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>像……一样</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                                            <div>① <strong>作介词：表示“像……一样”（外表相似、打比方）</strong>：<span className="prep-example-code">He looks like his father.</span>（他长得像他爸爸）, <span className="prep-example-code">She sings like an angel.</span></div>
                                            <div>② <strong>作介词：表示“例如 / 比如”</strong>（=such as）：<span className="prep-example-code">I like outdoor sports, like swimming and running.</span></div>
                                            <div>③ <strong>like 与 as 的区别</strong>：<code>like</code> 强调<strong>外貌相似（像）</strong>（如 <span className="prep-example-code">He talks like a teacher.</span> 他说话像个老师/实际上不是）；<code>as</code> 强调<strong>真实身份（作为）</strong>（如 <span className="prep-example-code">He works as a teacher.</span> 他作为一名教师工作/他真的是老师）。</div>
                                            <div>④ <strong>常用句型</strong>：<span className="prep-example-code">What's the weather like today?</span>（今天天气怎么样？）, <span className="prep-example-code">feel like doing sth.</span>（想要做某事）。</div>
                                        </div>
                                    </div>

                                    {/* AS */}
                                    <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed' }}>4. as 的介词用法</span>
                                            <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>作为 / 当作</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                                            <div>① <strong>作为（真实身份或功能）</strong>：<span className="prep-example-code">As a student, we should study hard.</span>（作为学生，我们应当努力学习）</div>
                                            <div>② <strong>固定搭配</strong>：<span className="prep-example-code">regard... as...</span>（把……视作……）, <span className="prep-example-code">treat... as...</span>（把……当作……）, <span className="prep-example-code">serve as</span>（充当/用作）</div>
                                            <div>③ <strong>常见成语短语</strong>：<span className="prep-example-code">as well as</span>（不仅……而且……/也）, <span className="prep-example-code">as for me</span>（至于我）, <span className="prep-example-code">such as</span>（例如）</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 1: TIME PREPOSITIONS */}
                            {prepositionTab === 'time' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 14px', borderRadius: '8px', color: '#166534' }}>
                                        <strong>💡 时间介词速记口诀：</strong>
                                        <div style={{ marginTop: '4px', fontWeight: 600 }}>
                                            “at用在点刻钟，on用在具体日，in年in月in季节，长段时间用在in。”
                                        </div>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: '80px' }}>介词</th>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: '220px' }}>适用场景与规则</th>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>常见示例</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb' }}>at</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <strong>具体时间点、时刻、短暂时间</strong>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className="prep-example-code">at 7:00, at noon, at night, at midnight, at sunrise, at this moment</span>
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>on</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <strong>具体的某一天、具体日期的早中晚、节日当天</strong>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className="prep-example-code">on Monday, on May 1st, on a rainy morning, on Children's Day, on weekends</span>
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#9333ea' }}>in</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <strong>泛指的月份、年份、季节、世纪、一天的某段</strong>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className="prep-example-code">in May, in 2024, in summer, in the 21st century, in the morning/afternoon</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {/* Special Traps */}
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px' }}>
                                        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>⚠️ 易错点突破：</div>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <li><strong>in time 与 on time</strong>：<span className="prep-example-code">in time</span> 表示“及时（赶上/没迟到）”；<span className="prep-example-code">on time</span> 表示“准时、按时（按时刻表）”。</li>
                                            <li><strong>有修饰词的早中晚</strong>：虽然普通早上用 <span className="prep-example-code">in the morning</span>，但如果有具体修饰（如 <span className="prep-example-code">on a cold morning</span>、<span className="prep-example-code">on Sunday morning</span>），介词必须变成 <strong>on</strong>！</li>
                                            <li><strong>in + 一段时间</strong>：用于将来时表示“...之后”（如 <span className="prep-example-code">He will be back in two days.</span>），提问用 <code>How soon</code>。</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: PLACE PREPOSITIONS */}
                            {prepositionTab === 'place' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 14px', borderRadius: '8px', color: '#1e40af' }}>
                                        <strong>💡 地点方位介词维度记忆法：</strong>
                                        <div style={{ marginTop: '4px' }}>
                                            • <strong>at（零维/点）</strong>：将地点视作地图上的一个“小点、车站、门牌”<br />
                                            • <strong>on（二维/面）</strong>：物体与表面有接触，在“线或面”上<br />
                                            • <strong>in（三维/体）</strong>：在立体的“大范围、空间、容器、城市国家”内部
                                        </div>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: '80px' }}>介词</th>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', width: '200px' }}>空间概念</th>
                                                <th style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>常见搭配与例句</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb' }}>at</td>
                                                <td style={{ padding: '10px 12px' }}>小地点、门牌号、交界点、活动场所</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className="prep-example-code">at the bus stop, at school, at home, at the station, at 221B Baker Street</span>
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#16a34a' }}>on</td>
                                                <td style={{ padding: '10px 12px' }}>在表面上、在街道上、在楼层</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className="prep-example-code">on the desk, on the wall, on the second floor, on Main Street, on the bus/train</span>
                                                </td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#9333ea' }}>in</td>
                                                <td style={{ padding: '10px 12px' }}>在大城市、国家、房间内部、封闭空间</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span className="prep-example-code">in Beijing, in China, in the room, in the box, in the car/taxi</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                        <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px' }}>📌 经典对比辨析：</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                <strong>in the tree vs on the tree</strong>
                                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                                                    <span className="prep-example-code">in the tree</span>：外来物落在树上（如鸟、人）；<br />
                                                    <span className="prep-example-code">on the tree</span>：树本身长出的（如叶子、苹果）。
                                                </div>
                                            </div>
                                            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                <strong>in the wall vs on the wall</strong>
                                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: '1.5' }}>
                                                    <span className="prep-example-code">on the wall</span>：挂在墙表面（如画、地图）；<br />
                                                    <span className="prep-example-code">in the wall</span>：嵌在墙内部（如门、窗、钉子）。
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: MOVEMENT & SPACE */}
                            {prepositionTab === 'movement' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* across vs through */}
                                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '1rem' }}>across vs through</span>
                                                <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>横穿 vs 穿越</span>
                                            </div>
                                            <div style={{ color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div>• <strong>across</strong>：从<strong>表面</strong>横过（二维）。例如：<span className="prep-example-code">walk across the street / bridge</span>（过马路/过桥）。</div>
                                                <div>• <strong>through</strong>：从<strong>立体内部</strong>穿过（三维）。例如：<span className="prep-example-code">go through the forest / tunnel / window</span>（穿过森林/隧道/窗户）。</div>
                                                <div>• <strong>over</strong>：从<strong>上方</strong>跨过/越过。例如：<span className="prep-example-code">jump over the wall</span>（跳过墙壁）。</div>
                                            </div>
                                        </div>

                                        {/* between vs among */}
                                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>between vs among</span>
                                                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>两者 vs 三者及以上</span>
                                            </div>
                                            <div style={{ color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div>• <strong>between</strong>：在<strong>两者</strong>之间（常见结构 <span className="prep-example-code">between A and B</span>）。</div>
                                                <div>• <strong>among</strong>：在<strong>三者或三者以上</strong>的群体之中（例如：<span className="prep-example-code">among the students</span>）。</div>
                                            </div>
                                        </div>

                                        {/* by vs with */}
                                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 700, color: '#9333ea', fontSize: '1rem' }}>by vs with vs in (方式与工具)</span>
                                                <span style={{ fontSize: '0.75rem', background: '#f3e8ff', color: '#7e22ce', padding: '2px 6px', borderRadius: '4px' }}>方式/工具辨析</span>
                                            </div>
                                            <div style={{ color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div>• <strong>by</strong>：通过...方式、乘某种交通工具（<span className="prep-example-code">by bus</span>, <span className="prep-example-code">by email</span>, <span className="prep-example-code">learn English by reading</span>）。</div>
                                                <div>• <strong>with</strong>：使用具体有形的工具、带有某种特征（<span className="prep-example-code">write with a pen</span>, <span className="prep-example-code">cut with a knife</span>, <span className="prep-example-code">a girl with glasses</span>）。</div>
                                                <div>• <strong>in</strong>：使用某种语言、材料、声音（<span className="prep-example-code">speak in English</span>, <span className="prep-example-code">write in ink</span>, <span className="prep-example-code">say in a loud voice</span>）。</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: HIGH FREQUENCY COLLOCATIONS */}
                            {prepositionTab === 'collocation' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        中考完形与填空中无提示词题型的核心得分点（动介、形介、介宾短语）：
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                        {[
                                            { en: 'be proud of', cn: '为……感到自豪', tag: 'of' },
                                            { en: 'be good at', cn: '擅长……', tag: 'at' },
                                            { en: 'be full of / fill...with', cn: '充满…… / 用……填满', tag: 'of/with' },
                                            { en: 'benefit from', cn: '得益于……/从……获益', tag: 'from' },
                                            { en: 'fall in love with', cn: '爱上……', tag: 'with' },
                                            { en: 'with the help of', cn: '在……的帮助下', tag: 'with' },
                                            { en: 'from... to...', cn: '从……到……', tag: 'from/to' },
                                            { en: 'pay attention to', cn: '注意……', tag: 'to' },
                                            { en: 'look forward to', cn: '期盼……（to为介词）', tag: 'to' },
                                            { en: 'be interested in', cn: '对……感兴趣', tag: 'in' },
                                            { en: 'instead of', cn: '代替；而不是', tag: 'of' },
                                            { en: 'depend on', cn: '取决于；依赖', tag: 'on' }
                                        ].map((item, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    background: '#ffffff',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    padding: '10px 12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '3px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{item.en}</strong>
                                                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{item.tag}</span>
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.cn}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowPrepositionModal(false)}
                                style={{
                                    background: 'var(--primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                我掌握了 (关闭)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
