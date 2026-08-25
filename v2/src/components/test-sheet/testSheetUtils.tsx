import React from 'react'

export const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

export const getOrdinal = (n: number): string => {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  if (n === 4) return "4th"
  if (n === 5) return "5th"
  return `${n}th`
}

export const parseWordBlocks = (prompt?: string): string[] => {
  if (!prompt) return []
  const result: string[] = []
  const rawParts = prompt.includes(',')
    ? prompt.split(',').map(s => s.trim()).filter(Boolean)
    : prompt.split(/\s+/).filter(Boolean)

  for (const part of rawParts) {
    const match = part.match(/^(.*?)\s*(\([.?!,;:]+\))$/)
    if (match) {
      if (match[1]) result.push(match[1])
      if (match[2]) result.push(match[2])
    } else {
      result.push(part)
    }
  }
  return result
}

export const unwrapBlockText = (raw: string): string => {
  if (raw.startsWith('(') && raw.endsWith(')')) {
    return raw.slice(1, -1)
  }
  return raw
}

export const formatSentenceFromBlocks = (blocks: string[]): string => {
  let sentence = ""
  for (let i = 0; i < blocks.length; i++) {
    const text = unwrapBlockText(blocks[i])
    const isPunct = /^[.?!,;:]+$/.test(text)
    if (i === 0 || isPunct) {
      sentence += text
    } else {
      sentence += " " + text
    }
  }
  return sentence
}

export const formatOptionWithLetter = (opt: string, idx: number): string => {
  const prefix = String.fromCharCode(65 + idx)
  const trimmed = String(opt || '').trim()
  if (/^[A-G][\.\s、]/i.test(trimmed)) {
    return trimmed
  }
  return `${prefix}. ${trimmed}`
}

export const cleanOptionText = (text: string, oIdx: number): string => {
  const prefix = String.fromCharCode(65 + oIdx)
  const regex = new RegExp(`^${prefix}\\s*[.\\u3001]\\s*`, 'i')
  return text.replace(regex, '')
}

export const normalizeSentence = (str: string): string => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+([.?!])/g, '$1')
    .replace(/\s+/g, ' ')
}

export const renderFormattedInlineText = (text: string): React.ReactNode => {
  if (!text) return null
  const parts = text.split(/(\*\*.*?\*\*|<u>.*?<\/u>|\[\*VISUAL:?\s*.*?\*\])/gi)
  return (
    <>
      {parts.map((part, idx) => {
        if (part.toLowerCase().startsWith('**') && part.endsWith('**')) {
          return <strong key={idx}>{renderFormattedInlineText(part.slice(2, -2))}</strong>
        }
        if (part.toLowerCase().startsWith('<u>') && part.toLowerCase().endsWith('</u>')) {
          return <u key={idx} style={{ fontWeight: 'bold' }}>{renderFormattedInlineText(part.slice(3, -4))}</u>
        }
        if (part.startsWith('[*VISUAL') && part.endsWith('*]')) {
          let innerText = part.slice(2, -2).trim()
          if (innerText.startsWith('VISUAL:')) {
            innerText = innerText.slice(7).trim()
          } else if (innerText.startsWith('VISUAL')) {
            innerText = innerText.slice(6).trim()
          }
          return (
            <span key={idx} className="ts-visual-tag" style={{ color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontStyle: 'normal' }}>
              🖼️ [图片提示: {innerText}]
            </span>
          )
        }
        return part
      })}
    </>
  )
}

export const renderPromptText = (text?: string): React.ReactNode => {
  if (!text) return null
  const trimmed = text.trim()
  if (trimmed.startsWith('[HTML:') && trimmed.endsWith(']')) {
    const rawHtml = trimmed.slice(6, -1)
    return <span dangerouslySetInnerHTML={{ __html: rawHtml }} />
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{renderFormattedInlineText(text)}</span>
}

export const isAnswerCorrect = (userAns: any, correctAns: any, sectionType?: string, qType?: string): boolean => {
  if (userAns === undefined || userAns === null || userAns === '' || correctAns === undefined || correctAns === null || correctAns === '') {
    return false
  }

  if (sectionType === 'multiple-choice' || sectionType === 'cloze-passage' || (sectionType === 'reading-comprehension' && qType === 'multiple-choice')) {
    if (!isNaN(Number(userAns)) && !isNaN(Number(correctAns))) {
      return Number(userAns) === Number(correctAns)
    }
  }

  if (sectionType === 'true-false') {
    return String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase()
  }

  if (sectionType === 'reading-comprehension' && qType === 'short-answer') {
    return String(userAns || '').trim().length > 0
  }

  if (sectionType === 'fill-in-the-blank-firstletter') {
    const ans = String(correctAns).trim().toLowerCase()
    const uAnsRaw = String(userAns).trim().toLowerCase()
    
    // Normalize multi-blank delimiters ('|||' or spaces) into clean space-separated tokens
    const uTokens = uAnsRaw.split(/\|\|\||\s+/).filter(Boolean)
    const cTokens = ans.split(/\s+/).filter(Boolean)

    if (uTokens.length === cTokens.length && uTokens.length > 1) {
      return uTokens.every((uTok, idx) => {
        const cTok = cTokens[idx]
        return uTok === cTok || (cTok.length > 1 && uTok === cTok.substring(1))
      })
    }

    const uAns = uTokens.join(' ')
    return uAns === ans || (ans.length > 1 && uAns === ans.substring(1))
  }

  if (sectionType === 'put-words-in-order') {
    const normUser = normalizeSentence(String(userAns))
    const normAns = normalizeSentence(String(correctAns))
    return normUser === normAns
  }

  // String / Wordbank / Matching / Cloze comparison
  const uStr = String(userAns).trim().toLowerCase()
  const cStr = String(correctAns).trim().toLowerCase()

  if (uStr === cStr) return true

  const extractLetter = (s: string) => {
    const trimmed = s.trim().toLowerCase()
    if (/^[a-z]$/.test(trimmed)) return trimmed
    const m = trimmed.match(/^([a-z])[\.\s]/)
    return m ? m[1] : null
  }

  const uLetter = extractLetter(uStr)
  const cLetter = extractLetter(cStr)

  if (uLetter && cLetter && uLetter === cLetter) {
    return true
  }

  return false
}
