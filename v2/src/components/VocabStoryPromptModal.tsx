import { useState } from 'react'
import './VocabGuideShell.css'

interface VocabStoryPromptModalProps {
    vocab: any[]
    onClose: () => void
}

export function generateStoryPrompt(vocab: any[]): string {
    const list = vocab
        .filter(item => item && item.word)
        .map((item, idx) => {
            const word = item.word.trim()
            const sentence = item.context_sentence ? item.context_sentence.trim() : ''
            return sentence ? `${idx + 1}. ${word} - ${sentence}` : `${idx + 1}. ${word}`
        })
        .join('\n')

    return `请根据我提供的生词和教材例句，写一篇生动有趣、逻辑通顺的短文（as short as possible）。

要求：
1. 包含列表中所有的单词/短语，并保持词义与语境自然契合。
2. 故事或情境要有趣、连贯，避免机械堆砌词汇。
3. 文中用【方括号与编号】标出用到的目标词汇。比如：Tomorrow is my [1. birthday]。编号与文末的单词释义编号对应。
4. 在文末附上每个词在短文中的简要中文释义，按在生成的文章中出现的顺序。不要出现双重编号。

【输入格式】
词汇列表与例句：
${list}`
}

export function VocabStoryPromptModal({ vocab, onClose }: VocabStoryPromptModalProps) {
    const [copied, setCopied] = useState(false)
    const promptText = generateStoryPrompt(vocab)

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(promptText)
            } else {
                fallbackCopy(promptText)
            }
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (e) {
            fallbackCopy(promptText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const fallbackCopy = (text: string) => {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try {
            document.execCommand('copy')
        } catch (err) {
            console.error('Fallback copy failed:', err)
        }
        document.body.removeChild(textarea)
    }

    return (
        <div className="vg-modal-backdrop" onClick={onClose}>
            <div 
                className="vg-story-prompt-modal" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="vg-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="vg-card-header-title">🤖 AI 记忆短文提示词</span>
                        <span className="vg-prompt-count-badge">{vocab.length} 词</span>
                    </div>
                    <button className="vg-modal-close-btn" onClick={onClose} title="Close">&times;</button>
                </div>

                <div className="vg-prompt-desc">
                    复制以下提示词并发送给 AI，生成包含本单元生词的趣味短文：
                </div>

                <div className="vg-prompt-content-wrapper">
                    <pre className="vg-prompt-pre">{promptText}</pre>
                </div>

                <div className="vg-prompt-footer">
                    <button 
                        className={`vg-prompt-copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied ? '✅ 已复制到剪贴板！' : '📋 复制提示词 (Copy Prompt)'}
                    </button>
                    <button className="vg-btn-secondary" onClick={onClose}>
                        关闭
                    </button>
                </div>
            </div>
        </div>
    )
}
