import { useState } from 'react'
import type { ReactNode } from 'react'
import './UsageGuide.css'

export function UsageGuide() {
  const [activeTab, setActiveTab] = useState<'welcome' | 'vocab' | 'text' | 'grammar' | 'writing' | 'mistakes' | 'pet'>('welcome')
  const [showChinese, setShowChinese] = useState(false)

  // Helper: pick EN or CN string/node
  const t = (en: ReactNode, cn: ReactNode): ReactNode => showChinese ? cn : en

  // State for Spelling Hero interactive demo
  const [spellingProgress, setSpellingProgress] = useState<string[]>([])
  const spellingOptions = ['b', 'oa', 't', 'ee', 'p']

  const handleSpellingClick = (chunk: string) => {
    if (spellingProgress.includes(chunk)) {
      setSpellingProgress(spellingProgress.filter(c => c !== chunk))
    } else {
      if (chunk === 'b' && spellingProgress.length === 0) {
        setSpellingProgress(['b'])
      } else if (chunk === 'oa' && spellingProgress.length === 1 && spellingProgress[0] === 'b') {
        setSpellingProgress(['b', 'oa'])
      } else if (chunk === 't' && spellingProgress.length === 2 && spellingProgress[1] === 'oa') {
        setSpellingProgress(['b', 'oa', 't'])
      }
    }
  }

  const resetSpelling = () => setSpellingProgress([])

  // State for Sentence Architect interactive demo
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const correctSentence = ['She', 'is', 'reading', 'a', 'book.']
  const noiseWords = ['are', 'read']

  const handleWordClick = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word))
    } else {
      setSelectedWords([...selectedWords, word])
    }
  }

  const resetSentence = () => setSelectedWords([])

  // State for Pet Companion interactive demo
  const [petLevel, setPetLevel] = useState(3)
  const [petExp, setPetExp] = useState(40)
  const [petHunger, setPetHunger] = useState(70)
  const [petEnergy, setPetEnergy] = useState(85)
  const [petActionText, setPetActionText] = useState('Happy to study with you! / 和你一起学习真开心！')

  const handleFeedPet = () => {
    setPetHunger(prev => Math.min(100, prev + 15))
    setPetExp(prev => {
      const nextExp = prev + 5
      if (nextExp >= 100) {
        setPetLevel(l => l + 1)
        setPetActionText('⭐ Level Up! Your companion is evolving! / 升级了！你的伙伴正在进化！')
        return 0
      }
      setPetActionText('😋 Yummy! Phonics cookies are delicious! / 好吃！拼读饼干太美味了！')
      return nextExp
    })
  }

  const handlePlayPet = () => {
    setPetEnergy(prev => Math.max(10, prev - 10))
    setPetHunger(prev => Math.max(10, prev - 5))
    setPetExp(prev => {
      const nextExp = prev + 15
      if (nextExp >= 100) {
        setPetLevel(l => l + 1)
        setPetActionText('⭐ Level Up! Your companion is evolving! / 升级了！你的伙伴正在进化！')
        return 0
      }
      setPetActionText('🎮 Wheee! Learning grammar is fun! / 耶！学语法好好玩！')
      return nextExp
    })
  }

  return (
    <div className="ug-container">
      {/* Premium Header */}
      <div className="ug-header">
        <div className="ug-header-content">
          <div className="ug-title-row">
            <h2 className="ug-title" style={{ position: 'relative' }}>
              <span className="ug-title-span" style={{ visibility: showChinese ? 'hidden' : 'visible' }}>Game Manual</span>
              <span className="ug-title-span" style={{ position: 'absolute', left: 0, top: 0, visibility: showChinese ? 'visible' : 'hidden' }}>游戏手册</span>
            </h2>
            <div className="ug-lang-toggle" role="group" aria-label="Language toggle">
              <span
                className={`ug-lang-opt ${!showChinese ? 'active' : ''}`}
                onClick={() => setShowChinese(false)}
              >EN</span>
              <span
                className={`ug-lang-opt ${showChinese ? 'active' : ''}`}
                onClick={() => setShowChinese(true)}
              >中文</span>
            </div>
          </div>
          <p className="ug-subtitle">
            {t(
              <>Learn how to master vocabulary, reading, grammar and writing using the tailored study tools in <span className="brand-highlight">TextbookPass</span>.</>,
              <>了解如何使用<span className="brand-highlight">同步派</span>的专属学习工具，掌握词汇、阅读理解、语法和写作。</>
            )}
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="ug-layout">
        {/* Navigation Sidebar */}
        <div className="ug-sidebar">
          <button
            className={`ug-sidebar-btn ${activeTab === 'welcome' ? 'active' : ''}`}
            onClick={() => setActiveTab('welcome')}
          >
            <span className="icon">👋</span>
            <span>{t('Quick Start', '快速入门')}</span>
          </button>

          <button
            className={`ug-sidebar-btn ${activeTab === 'vocab' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocab')}
          >
            <span className="icon">📚</span>
            <span>{t('Vocabulary', '词汇')}</span>
          </button>

          <button
            className={`ug-sidebar-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <span className="icon">📖</span>
            <span>{t('Text / Passage', '阅读理解')}</span>
          </button>

          <button
            className={`ug-sidebar-btn ${activeTab === 'grammar' ? 'active' : ''}`}
            onClick={() => setActiveTab('grammar')}
          >
            <span className="icon">🏗️</span>
            <span>{t('Sentence & Grammar', '句子与语法')}</span>
          </button>

          <button
            className={`ug-sidebar-btn ${activeTab === 'writing' ? 'active' : ''}`}
            onClick={() => setActiveTab('writing')}
          >
            <span className="icon">✍️</span>
            <span>{t('Writing', '写作')}</span>
          </button>

          <button
            className={`ug-sidebar-btn ${activeTab === 'mistakes' ? 'active' : ''}`}
            onClick={() => setActiveTab('mistakes')}
          >
            <span className="icon">📓</span>
            <span>{t('Mistake Book', '错题本')}</span>
          </button>

          <button
            className={`ug-sidebar-btn ${activeTab === 'pet' ? 'active' : ''}`}
            onClick={() => setActiveTab('pet')}
          >
            <span className="icon">👾</span>
            <span>{t('Companion & Rewards', '学习伙伴与奖励')}</span>
          </button>
        </div>

        {/* Dynamic Content Pane */}
        <div className="ug-content">

          {/* ── Quick Start ───────────────────────────────────── */}
          {activeTab === 'welcome' && (
            <>
              <div>
                <h3 className="ug-section-title">🌟 {t(<>Welcome to <span className="brand-highlight">TextbookPass</span></>, <>欢迎使用<span className="brand-highlight">同步派</span></>)}</h3>
                <p className="ug-section-intro">
                  {t(
                    'This application converts standard curriculum textbook units into highly engaging, interactive cognitive tasks — six practice areas working together to build lasting fluency.',
                    '本应用将同步教材单元转化为高度互动的认知练习任务，六大板块协同运作，帮助你建立持久的语言流利度。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card" onClick={() => setActiveTab('vocab')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📚</span>
                    <h4 className="ug-card-title">{t('Vocabulary', '词汇')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Review UK IPA pronunciation, practise phonics-based spelling chunk-by-chunk, and take Cloze / translation challenge rounds.',
                      '复习英式 IPA 发音，按音节/语音块练习拼写，完成完形填空与翻译挑战。'
                    )}
                  </p>
                  <span className="ug-card-badge">{t('3 tools', '3 个工具')}</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('text')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📖</span>
                    <h4 className="ug-card-title">{t('Text / Passage', '阅读理解')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Navigate reading passages sentence-by-sentence, decode translations with subtle traps, and tackle workbook comprehension challenges.',
                      '逐句导航阅读文本，识别含细微干扰的翻译选项，完成练习册阅读理解题。'
                    )}
                  </p>
                  <span className="ug-card-badge">{t('3 tools', '3 个工具')}</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('grammar')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🏗️</span>
                    <h4 className="ug-card-title">{t('Sentence & Grammar', '句子与语法')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Reconstruct key sentences from word blocks, quiz grammar rules across five cognitive layers, and review unit mindmaps.',
                      '用单词块重组关键句子，通过五层认知维度检测语法规则，并复习单元思维导图。'
                    )}
                  </p>
                  <span className="ug-card-badge">{t('3 tools', '3 个工具')}</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('writing')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">✍️</span>
                    <h4 className="ug-card-title">{t('Writing', '写作')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Study two-tier model essays (Basic & Advanced), explore writing structures, and practise cohesive devices and grammar-level sentence patterns.',
                      '学习两层次范文（基础版与进阶版），探索写作结构，练习衔接词与语法句型。'
                    )}
                  </p>
                  <span className="ug-card-badge">{t('1 tool', '1 个工具')}</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('mistakes')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📓</span>
                    <h4 className="ug-card-title">{t('Mistake Book', '错题本')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Auto-logs every wrong answer. Filter solved items, do a targeted quick-review session, or re-practice any question individually.',
                      '自动记录每道错题。可筛选已解决的题目，进行针对性快速复习，或单独重练任意题目。'
                    )}
                  </p>
                  <span className="ug-card-badge">{t('Local-first sync', '本地优先同步')}</span>
                </div>

                <div className="ug-card" onClick={() => setActiveTab('pet')}>
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🏆</span>
                    <h4 className="ug-card-title">{t('Companion & Rewards', '学习伙伴与奖励')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Adopt a study companion! Earn Gold Coins from correct answers, maintain daily streaks, and watch your companion evolve.',
                      '领养一个学习伙伴！答对题目赚取金币，保持每日连续练习，看着伙伴不断进化成长。'
                    )}
                  </p>
                  <span className="ug-card-badge">{t('Reward system', '奖励系统')}</span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  📈 {t('Navigating the Dashboard', '如何使用主界面')}
                </h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>{t('Weekly Activity Tracker:', '周练习追踪图：')}</strong>{' '}
                    {t(
                      'A combined bar-and-line chart showing your practice frequency and score trends at a glance.',
                      '柱状图与折线图的组合图表，一眼看清你的练习频率和得分趋势。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Practice History Table:', '练习历史记录表：')}</strong>{' '}
                    {t(
                      'Review exact timestamps, duration spent, and scores of every completed exercise per textbook.',
                      '查看每本教材中每次已完成练习的精确时间戳、用时和得分。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Book Sections:', '教材章节：')}</strong>{' '}
                    {t(
                      'Switch between units and see your progress visualiser with color-coded completion badges.',
                      '在各单元之间切换，查看带有颜色标注完成徽章的进度可视化图。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Mistake Book shortcut:', '错题本快捷入口：')}</strong>{' '}
                    {t(
                      'Tap the 📓 icon in any practice shell to jump directly to the relevant mistake cards.',
                      '在任意练习界面点击 📓 图标，可直接跳转到对应的错题卡片。'
                    )}
                  </li>
                </ul>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  🧠 {t('Practice Design Philosophy', '练习设计理念')}
                </h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>{t('Immediate Feedback:', '即时反馈：')}</strong>{' '}
                    {t(
                      'Every answer is evaluated instantly — correct or wrong, you see the result right away with no waiting.',
                      '每道题答完立即判定，无论对错即时呈现结果，无需等待。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Retry Within a Challenge:', '错题即时重练：')}</strong>{' '}
                    {t(
                      'Wrong answers are recycled to the back of the current challenge queue so you face them again before finishing — reinforcing the correct answer while context is still fresh.',
                      '答错的题目立即回到当前挑战队列末尾，在本次挑战结束前你会再次遇到它——趁记忆新鲜，强化正确答案。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Active Recall:', '主动回想：')}</strong>{' '}
                    {t(
                      'Text Navigator and Model Writing Map ask you to reconstruct sentences from keyword hints before revealing the answer, training retrieval rather than passive re-reading.',
                      '课文导航和范文图谱要求先凭关键词提示主动回想句子，再揭示答案——训练提取记忆而非被动重读。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Spaced Repetition via Mistake Book:', '错题本驱动的间隔重复：')}</strong>{' '}
                    {t(
                      'Mistakes are stored and resurfaced in future review sessions, ensuring weak points receive repeated targeted practice across multiple study sessions.',
                      '错题保存后在日后复习环节中再次出现，确保薄弱点跨越多个学习周期得到反复专项练习。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Multi-modal Input:', '多模态输入：')}</strong>{' '}
                    {t(
                      'Audio TTS read-alouds, 3D flashcard flipping, phonics chunk selection, and word-block arrangement engage multiple cognitive channels simultaneously for deeper encoding.',
                      '音频 TTS 朗读、3D 闪卡翻转、音素块点选和词块排列同时调动多条认知通路，实现更深层的记忆编码。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Progressive Challenge Structure:', '渐进式挑战结构：')}</strong>{' '}
                    {t(
                      'Challenges are split into groups of 10 questions. Completing one unlocks the next, building momentum and preventing cognitive overload.',
                      '挑战以每组10题的形式划分，完成一组后解锁下一组，营造持续推进的节奏感，同时避免认知过载。'
                    )}
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* ── Vocabulary ────────────────────────────────────── */}
          {activeTab === 'vocab' && (
            <>
              <div>
                <h3 className="ug-section-title">📚 {t('Vocabulary & Phonics Tools', '词汇与拼读工具')}</h3>
                <p className="ug-section-intro">
                  {t(
                    'Master phonetic sounds, spelling chunks, and semantic usage through three primary practice structures.',
                    '通过三种核心练习结构，掌握语音、拼写块和词义用法。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📖</span>
                    <h4 className="ug-card-title">{t('Vocab Guide', '词汇导引')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'A study sheet extracted from unit vocabulary. It details the page source, standard UK IPA, syllable categories (e.g. VCe, Closed), phoneme comparisons (distractor pairs), and creative Chinese mnemonics (memorization hooks). Includes an interactive flashcard modal (click ▶️ Play) with 3D card flipping, automatic context sentence audio read-alouds, manual toggle review, and a 10s auto-advancing spaced repetition review timer.',
                      '从单元词汇提取的学习表单，包含页码来源、英式 IPA、音节类型（如 VCe、闭音节）、音素对比（混淆对）和创意中文记忆钩。含互动闪卡弹窗（点击 ▶️ 播放），支持 3D 翻卡、自动朗读例句、手动切换复习和 10 秒自动翻卡的间隔复习计时器。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🔥</span>
                    <h4 className="ug-card-title">{t('Vocab Master', '词汇闯关')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'A challenge of 10-question tests spanning three categories: Cloze (fill-in-the-blanks with contextual hints for ambiguous items), Chinese-to-English translation, and English-to-Chinese selection.',
                      '每组 10 题的挑战，涵盖三种题型：完形填空（歧义题附中文提示）、中译英和英译中选择。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">⚡</span>
                    <h4 className="ug-card-title">{t('Spelling Hero', '拼写英雄')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Interactive spelling puzzles. Single-syllable words are split into grapheme phonics chunks (e.g., b-oa-t), whereas multi-syllable words are split by syllables (e.g., an-i-mal).',
                      '互动拼写谜题。单音节单词按字母组合（语音块）拆分（如 b-oa-t），多音节单词按音节拆分（如 an-i-mal）。'
                    )}
                  </p>
                </div>
              </div>

              {/* Interactive Phonics Spelling Demo */}
              <div className="ug-demo-block">
                <h4 className="ug-demo-title">🎮 {t('Spelling Hero Demo: Build the word "boat"', '拼写英雄演示：拼出单词 "boat"')}</h4>
                <div className="ug-demo-window">
                  <div className="ug-preview-spelling">
                    {spellingProgress.length > 0 ? spellingProgress.join(' ') : '✏️ _ _ _'}
                  </div>
                  <div className="ug-preview-word-chunks">
                    {spellingOptions.map((opt, i) => (
                      <button
                        key={i}
                        className={`ug-chunk-btn ${spellingProgress.includes(opt) ? 'selected' : ''}`}
                        onClick={() => handleSpellingClick(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {spellingProgress.length === 3 ? (
                      <span style={{ color: 'var(--tab-active-text)', fontWeight: 'bold' }}>
                        🎉 {t('Correct! Phonics chunks combined!', '正确！音素块组合成功！')}
                      </span>
                    ) : spellingProgress.length > 0 ? (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                        {t('Select the next chunk in order...', '按顺序选择下一个音素块……')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                        {t('Click chunks below to spell the word.', '点击下方音素块来拼写单词。')}
                      </span>
                    )}
                    {spellingProgress.length > 0 && (
                      <button
                        onClick={resetSpelling}
                        style={{ marginLeft: 12, padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)' }}
                      >
                        {t('Reset', '重置')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Text / Passage Understanding ──────────────────── */}
          {activeTab === 'text' && (
            <>
              <div>
                <h3 className="ug-section-title">📖 {t('Text / Passage Understanding Tools', '阅读理解工具')}</h3>
                <p className="ug-section-intro">
                  {t(
                    'Build deep comprehension of unit reading passages and dialogues through three dedicated tools — from interactive sentence-path navigation to translation discrimination and workbook MCQs.',
                    '通过三个专用工具深度理解单元课文与对话——从交互式逐句导航到翻译辨析，再到练习册选择题。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧭</span>
                    <h4 className="ug-card-title">{t('Text Navigator', '课文导航')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'An interactive hierarchical path builder that breaks down reading passages sentence-by-sentence. Each node integrates a True / False grammar check, vocabulary notes, Chinese translation, and keyword prompt hints.',
                      '交互式层级路径构建器，将课文逐句拆解。每个节点含判断题语法检测、词汇注释、中文翻译和关键词提示。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🔍</span>
                    <h4 className="ug-card-title">{t('Passage Decoder', '课文解码')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Deconstruct reading passages or dialogues line-by-line. Read each English sentence and pick the correct Chinese translation from three options — distractors include subtle vocabulary swaps, tense errors, and negation flips.',
                      '逐行拆解课文或对话。读取每句英文，从三个选项中选出正确中文翻译——干扰项含细微词汇替换、时态错误和否定反转。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">📝</span>
                    <h4 className="ug-card-title">{t('Reading & Expression', '阅读与表达')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Workbook-style comprehension tests with three detail MCQs and one open-ended sentence-ordering task. Practise selecting cohesive opinion–reason–summary answer blocks.',
                      '练习册式阅读理解测试，含三道细节选择题和一道开放式句子排序任务。练习选取连贯的"观点—理由—总结"答题模块。'
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  💡 {t('Tips for Passage Tools', '阅读工具使用技巧')}
                </h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>{t('Text Navigator keywords:', '课文导航关键词：')}</strong>{' '}
                    {t(
                      'Before revealing a node, try to recall the sentence from the keyword hint alone — this trains active recall rather than passive reading.',
                      '揭开节点前，尝试仅凭关键词提示回忆句子——这能培养主动回想能力，而非被动阅读。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Passage Decoder traps:', '课文解码陷阱：')}</strong>{' '}
                    {t(
                      'Distractors are deliberately natural-sounding. Read carefully for tense, negation, and pronoun differences before selecting.',
                      '干扰项故意设计得很自然。选择前仔细辨别时态、否定和代词的差异。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Reading & Expression open question:', '阅读与表达开放题：')}</strong>{' '}
                    {t(
                      'Arrange the Opinion → Reason → Summary blocks in order to form a coherent extended-response answer of 20+ words.',
                      '按顺序排列"观点 → 理由 → 总结"模块，组成一个连贯的、20词以上的扩展回答。'
                    )}
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* ── Sentence & Grammar ────────────────────────────── */}
          {activeTab === 'grammar' && (
            <>
              <div>
                <h3 className="ug-section-title">🏗️ {t('Sentence & Grammar Tools', '句子与语法工具')}</h3>
                <p className="ug-section-intro">
                  {t(
                    'Master sentence construction and grammar rules through three progressive tools — from unit mindmaps to block-based reconstruction and five-layer grammar quizzes.',
                    '通过三个递进式工具掌握句子构建与语法规则——从单元思维导图到词块重组，再到五层语法测验。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🗺️</span>
                    <h4 className="ug-card-title">{t('Recall Map', '记忆图谱')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'A hierarchical mindmap outlining unit stories into memory keys, categorising key vocabulary by part of speech, and displaying core grammar structures for quick review.',
                      '层级思维导图，将单元故事提炼为记忆要点，按词性归类核心词汇，并展示核心语法结构以供快速复习。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧱</span>
                    <h4 className="ug-card-title">{t('Sentence Architect', '句子构建师')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Reconstruct key sentences from individual word blocks. Filter out decoy "noise" blocks and arrange the correct blocks in order — natural word-order variations are accepted.',
                      '用单个词块重组关键句子。过滤掉"噪音"干扰块，按正确顺序排列——自然的语序变体同样被接受。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧙‍♂️</span>
                    <h4 className="ug-card-title">{t('Grammar Wizard', '语法巫师')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Multiple-choice quiz challenges verifying grammar across five cognitive layers: Purpose, Definition, Formation, Usage, and Differentiation. Includes detailed Chinese explanations and bilingual hints.',
                      '多选题挑战，通过五个认知层次检测语法：目的、定义、构成、用法和辨析。含详细中文解析和双语提示。'
                    )}
                  </p>
                </div>
              </div>

              {/* Interactive Sentence Architect Demo */}
              <div className="ug-demo-block">
                <h4 className="ug-demo-title">🎮 {t('Sentence Architect Demo: Arrange blocks to build "She is reading a book."', '句子构建师演示：排列词块，组成 "She is reading a book."')}</h4>
                <div className="ug-demo-window">
                  <div style={{ minHeight: 40, borderBottom: '1px dashed var(--border)', paddingBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedWords.length > 0 ? (
                      selectedWords.map((w, i) => (
                        <span key={i} className="ug-word-block" onClick={() => handleWordClick(w)}>
                          {w}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                        {t('Arrange blocks from the tray...', '从词块托盘中排列词块……')}
                      </span>
                    )}
                  </div>

                  <div className="ug-preview-blocks">
                    {correctSentence.map((w, i) => (
                      <button
                        key={i}
                        className="ug-word-block"
                        disabled={selectedWords.includes(w)}
                        onClick={() => handleWordClick(w)}
                      >
                        {w}
                      </button>
                    ))}
                    {noiseWords.map((w, i) => (
                      <button
                        key={`n-${i}`}
                        className="ug-word-block noise"
                        disabled={selectedWords.includes(w)}
                        onClick={() => handleWordClick(w)}
                        title={showChinese ? '干扰噪音块！' : 'Decoy noise block!'}
                      >
                        {w}
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {JSON.stringify(selectedWords) === JSON.stringify(correctSentence) ? (
                      <span style={{ color: 'var(--tab-active-text)', fontWeight: 'bold' }}>
                        🎉 {t('Correct! Structure matches exactly.', '正确！句子结构完全匹配。')}
                      </span>
                    ) : selectedWords.some(w => noiseWords.includes(w)) ? (
                      <span style={{ color: '#cb2431', fontWeight: 'bold' }}>
                        ⚠️ {t('Oops! You included a decoy block. Click it to remove.', '哎呀！你包含了干扰块，点击它移除。')}
                      </span>
                    ) : selectedWords.length > 0 ? (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                        {t('Keep building...', '继续构建……')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
                        {t('Avoid red decoy blocks. Click blocks in the tray.', '避开红色干扰块，点击托盘中的词块。')}
                      </span>
                    )}
                    {selectedWords.length > 0 && (
                      <button
                        onClick={resetSentence}
                        style={{ marginLeft: 12, padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)' }}
                      >
                        {t('Reset', '重置')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Writing ───────────────────────────────────────── */}
          {activeTab === 'writing' && (
            <>
              <div>
                <h3 className="ug-section-title">✍️ {t('Writing Tools', '写作工具')}</h3>
                <p className="ug-section-intro">
                  {t(
                    'Develop structured writing skills through two-tier model essays — study how a Basic response is progressively elevated into an Advanced one using cohesive devices, complex sentences, and richer vocabulary.',
                    '通过两层次范文培养结构化写作能力——学习如何利用衔接词、复杂句和更丰富词汇，将基础版回答逐步提升为进阶版。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🗺️</span>
                    <h4 className="ug-card-title">{t('Model Writing Map', '范文图谱')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'An interactive mindmap presenting two model essays — Model 1 (Basic) uses simple SVO sentences, while Model 2 (Advanced) introduces relative clauses, connectors, and cohesive devices like "For example", "As a result", and "In addition".',
                      '展示两篇范文的交互式思维导图——范文一（基础版）使用简单主谓宾句，范文二（进阶版）引入定语从句、连接词和衔接词，如"For example"、"As a result"和"In addition"。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🔵</span>
                    <h4 className="ug-card-title">{t('Glue Words & Highlights', '衔接词与高亮标注')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Key transition phrases and cohesive devices are highlighted in blue within each model essay node, making it easy to identify the "glue" that holds advanced writing together.',
                      '每个范文节点中的关键过渡短语和衔接词以蓝色高亮显示，让你轻松识别使进阶写作凝聚成篇的"胶水词"。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🎯</span>
                    <h4 className="ug-card-title">{t('Level-Aligned Content', '课标对应内容')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'All vocabulary, grammar structures, and sentence patterns in the model essays are strictly aligned to the unit level — no out-of-syllabus language is introduced.',
                      '范文中所有词汇、语法结构和句型均严格对应单元课标——不引入超纲语言。'
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  📝 {t('How to Use Model Writing Maps', '如何使用范文图谱')}
                </h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>{t('Start with Model 1:', '从范文一开始：')}</strong>{' '}
                    {t(
                      'Read the Basic essay branch-by-branch to understand the core structure — Introduction, Body, and Conclusion.',
                      '逐分支阅读基础版范文，理解核心结构——开头、主体和结尾。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Compare with Model 2:', '与范文二对比：')}</strong>{' '}
                    {t(
                      'Toggle to the Advanced model and identify the highlighted glue words added at each node to elevate the writing quality.',
                      '切换到进阶版范文，找出每个节点中新增的高亮衔接词，看它们如何提升写作质量。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Active recall practice:', '主动回想练习：')}</strong>{' '}
                    {t(
                      'Hide each node and try to reconstruct the sentence from the keyword hint before revealing it — the same mechanic as Text Navigator.',
                      '隐藏每个节点，尝试仅凭关键词提示重构句子再揭开——与课文导航的机制相同。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Write your own:', '自己写：')}</strong>{' '}
                    {t(
                      'Use the model structure as a scaffold to compose your own essay, swapping in personal details while keeping the sentence patterns.',
                      '以范文结构为支架写自己的文章，保留句型框架，换入个人内容。'
                    )}
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* ── Mistake Book ──────────────────────────────────── */}
          {activeTab === 'mistakes' && (
            <>
              <div>
                <h3 className="ug-section-title">📓 {t('Mistake Book (错题本)', '错题本')}</h3>
                <p className="ug-section-intro">
                  {t(
                    'A premium local-first review tool that automatically logs questions you answered incorrectly across any practice shell.',
                    '高品质的本地优先复习工具，自动记录你在任意练习模块中答错的题目。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">⚡</span>
                    <h4 className="ug-card-title">{t('Real-time Logging', '实时记录')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      "Any incorrect attempt is immediately saved in the browser's local cache so there is zero gameplay lag, and synced to the secure Cloudflare D1 database.",
                      '任何错误尝试都会立即保存在浏览器本地缓存中（零延迟），并同步到安全的 Cloudflare D1 数据库。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">✅</span>
                    <h4 className="ug-card-title">{t('Solved Question Marker', '已解决标记')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'When you review a mistake and answer it correctly, it is marked as solved and can be filtered out. It is not permanently deleted, letting you re-practice later.',
                      '当你在复习中答对一道错题时，它会被标记为"已解决"并可被过滤掉。该题不会被永久删除，方便日后继续练习。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🔄</span>
                    <h4 className="ug-card-title">{t('Show/Hide Filter', '显示/隐藏筛选')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Toggle the "Show resolved" switch in the sidebar to review all past mistakes or hide solved ones to keep your practice book clean.',
                      '切换侧边栏的"显示已解决"开关，可查看所有历史错题，或隐藏已解决题目以保持练习本整洁。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">✏️</span>
                    <h4 className="ug-card-title">{t('Quick Review', '快速复习')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Launch "Quick Review All" or "Review Unit" to go through your active mistakes. Correct answers resolve the item, while wrong answers recycle it to the back.',
                      '启动"全部快速复习"或"复习本单元"，逐一过完当前错题。答对则标记为已解决，答错则循环至队尾。'
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-h)' }}>
                  💡 {t('Pro-Tip for Reviewing', '复习专业技巧')}
                </h4>
                <ul className="ug-list">
                  <li className="ug-list-item">
                    <strong>{t('Individual Review:', '单题复习：')}</strong>{' '}
                    {t(
                      'Use the "Review" button next to any specific card to inspect or practice it. Solved cards will display a "Review Again" option.',
                      '点击任意卡片旁的"复习"按钮，可单独查看或练习该题。已解决的卡片会显示"再次复习"选项。'
                    )}
                  </li>
                  <li className="ug-list-item">
                    <strong>{t('Audio Feedbacks:', '音频反馈：')}</strong>{' '}
                    {t(
                      'Correct answers in review session automatically trigger native TTS audio read-alouds to reinforce phonetic memory.',
                      '复习环节中答对后，系统自动触发原生 TTS 朗读，以强化语音记忆。'
                    )}
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* ── Companion & Rewards ───────────────────────────── */}
          {activeTab === 'pet' && (
            <>
              <div>
                <h3 className="ug-section-title">🏆 {t('Study Companion & Reward System', '学习伙伴与奖励系统')}</h3>
                <p className="ug-section-intro">
                  {t(
                    'A custom interactive companion that floats in the corner of your practice viewport, lives on your dashboard, and rewards your consistency.',
                    '一个专属互动伙伴，悬浮在练习界面角落，驻留在主界面上，并奖励你的坚持。'
                  )}
                </p>
              </div>

              <div className="ug-grid">
                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🍩</span>
                    <h4 className="ug-card-title">{t('Companion Hunger', '伙伴饥饿度')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      "Your companion's hunger bar slowly decays. Spend Gold Coins earned from correct answers to buy food and feed them to keep them cheerful.",
                      '伙伴的饥饿条会缓慢下降。用答题正确赚取的金币购买食物并喂给伙伴，让它保持愉快心情。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">⚡</span>
                    <h4 className="ug-card-title">{t('Study Energy', '学习能量')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Completing challenges boosts your companion\'s energy and awards Experience Points (EXP) and Gold Coins to spend.',
                      '完成挑战可提升伙伴的能量，并获得经验值（EXP）和金币用于消费。'
                    )}
                  </p>
                </div>

                <div className="ug-card">
                  <div className="ug-card-header">
                    <span className="ug-card-icon">🧬</span>
                    <h4 className="ug-card-title">{t('Companion Evolution', '伙伴进化')}</h4>
                  </div>
                  <p className="ug-card-desc">
                    {t(
                      'Once the EXP bar hits 100%, your companion levels up. Higher levels change their look and unlock gorgeous glowing dashboard styles.',
                      '当经验条达到 100% 时，伙伴升级。更高等级会改变外观，并解锁华丽的发光主界面风格。'
                    )}
                  </p>
                </div>
              </div>

              {/* Interactive Pet Demo */}
              <div className="ug-demo-block">
                <h4 className="ug-demo-title">🎮 {t('Study Companion Demo: Feed or play to earn EXP', '学习伙伴演示：喂食或游玩以获得经验值')}</h4>
                <div className="ug-demo-window">
                  <div className="ug-pet-preview-container">
                    <div className="ug-pet-avatar-wrapper">
                      🐱
                    </div>

                    <div className="ug-pet-stats">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-h)' }}>
                          {t(`Level ${petLevel} Study Companion`, `等级 ${petLevel} 学习伙伴`)}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>EXP: {petExp}%</span>
                      </div>

                      {/* EXP Bar */}
                      <div className="ug-pet-bar-outer" style={{ height: 8 }}>
                        <div className="ug-pet-bar-inner" style={{ width: `${petExp}%`, background: 'var(--accent)' }} />
                      </div>

                      {/* Hunger */}
                      <div className="ug-pet-stat-row">
                        <span className="ug-pet-stat-label">🍩 {t('Hunger:', '饥饿度：')}</span>
                        <div className="ug-pet-bar-outer">
                          <div className="ug-pet-bar-inner" style={{ width: `${petHunger}%`, background: '#22c55e' }} />
                        </div>
                        <span style={{ width: 34, fontSize: '0.8rem', textAlign: 'right' }}>{petHunger}%</span>
                      </div>

                      {/* Energy */}
                      <div className="ug-pet-stat-row">
                        <span className="ug-pet-stat-label">⚡ {t('Energy:', '能量：')}</span>
                        <div className="ug-pet-bar-outer">
                          <div className="ug-pet-bar-inner" style={{ width: `${petEnergy}%`, background: '#f59e0b' }} />
                        </div>
                        <span style={{ width: 34, fontSize: '0.8rem', textAlign: 'right' }}>{petEnergy}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <p style={{ fontStyle: 'italic', color: 'var(--accent)', fontSize: '0.9rem', marginBottom: 12 }}>
                      {petActionText}
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button
                        className="ug-sidebar-btn"
                        onClick={handleFeedPet}
                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }}
                      >
                        🍪 {t('Feed Companion Cookie (+5 EXP)', '喂食拼读饼干 (+5 EXP)')}
                      </button>
                      <button
                        className="ug-sidebar-btn"
                        onClick={handlePlayPet}
                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }}
                        disabled={petEnergy <= 10}
                      >
                        🎮 {t('Study Grammar (+15 EXP)', '学习语法 (+15 EXP)')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
