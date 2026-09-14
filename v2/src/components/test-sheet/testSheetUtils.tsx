import React from 'react'
import md5 from 'md5'

export const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

export const resolveTestAudioUrl = (audio: { url?: string; text?: string } | undefined | null, textbook: string): string => {
  if (!audio) return ''
  if (audio.url) return audio.url
  const text = audio.text?.trim()
  if (!text) return ''
  const hash = md5(text)
  const bookCategory = (textbook || '').toLowerCase()
  return `${PUBLIC_URL_BASE}/ep/${bookCategory}/${hash}.mp3`
}

export const toRomanNumeral = (num: number): string => {
  const romanMap: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ]
  let result = ''
  let n = num
  for (const [val, roman] of romanMap) {
    while (n >= val) {
      result += roman
      n -= val
    }
  }
  return result || String(num)
}

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
  
  // Tokenize taking into account parenthesized tokens like (,), (.), (?), etc.
  const tokens: string[] = []
  let current = ''
  let inParen = false
  for (let i = 0; i < prompt.length; i++) {
    const ch = prompt[i]
    if (ch === '(') {
      inParen = true
      current += ch
    } else if (ch === ')') {
      inParen = false
      current += ch
    } else if (ch === ',' && !inParen) {
      if (current.trim()) tokens.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) tokens.push(current.trim())

  for (const part of tokens) {
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
  const trimmed = raw.trim()
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
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

  // Capitalize the first alphabetic letter in the formed sentence
  return sentence.replace(/^([^a-zA-Z]*)([a-z])/, (_match, prefix, firstChar) => {
    return prefix + firstChar.toUpperCase()
  })
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

export const renderOptionContent = (opt: string, idx: number): React.ReactNode => {
  const prefix = String.fromCharCode(65 + idx)
  const cleaned = cleanOptionText(String(opt || ''), idx)
  return (
    <>
      <strong className="ts-option-prefix">{prefix}. </strong>
      {renderPromptText(cleaned)}
    </>
  )
}


export const normalizeSentence = (str: string): string => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+([.?!])/g, '$1')
    .replace(/\s+/g, ' ')
}
export const splitIntoSentences = (text: string): string[] => {
  if (!text) return []
  // Common honorifics and abbreviations that should NOT terminate a sentence
  const honorificRegex = /\b(Mr|Mrs|Ms|Miss|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|No|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Vol|pp|p)\.$/i
  // Single capital letter initial like "A.", "B.", "J. K." (but not words ending with periods)
  const initialRegex = /(^|\s)[A-Z]\.$/

  const rawTokens = text.split(/(?<=[.!?])\s+/)
  const sentences: string[] = []
  let buffer = ''

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i]
    buffer = buffer ? `${buffer} ${token}` : token

    const trimmed = buffer.trim()
    const nextToken = i + 1 < rawTokens.length ? rawTokens[i + 1].trim() : ''

    const isHonorific = honorificRegex.test(trimmed)
    const isInitial = initialRegex.test(trimmed)
    // A period after a number is only a decimal separator if the next token starts with digits (e.g., "3." + "14")
    const isDecimal = /\d\.$/.test(trimmed) && /^\d/.test(nextToken)

    if (i === rawTokens.length - 1 || (!isHonorific && !isInitial && !isDecimal)) {
      sentences.push(buffer)
      buffer = ''
    }
  }

  if (buffer) {
    sentences.push(buffer)
  }

  return sentences
}

export const renderFormattedInlineText = (text: string): React.ReactNode => {
  if (!text) return null
  const parts = text.split(/(\*\*.*?\*\*|<u>.*?<\/u>|<br\s*\/?>|\[\*VISUAL:?\s*.*?\*\])/gi)
  return (
    <>
      {parts.map((part, idx) => {
        if (/^<br\s*\/?>$/i.test(part)) {
          return <br key={idx} />
        }
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
  // Strip leading question numbering like "1. ", "2. ", "(1) " if present so it doesn't duplicate ts-question-num
  const cleanText = text.trim().replace(/^(\d+[\.、\)]|\(\d+\))\s*/, '')
  if (cleanText.includes('[HTML:')) {
    const parts = cleanText.split(/(\[HTML:[\s\S]*?\])/g)
    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('[HTML:') && part.endsWith(']')) {
            const rawHtml = part.slice(6, -1)
            return <span key={idx} className="ts-html-embed" dangerouslySetInnerHTML={{ __html: rawHtml }} />
          }
          if (!part.trim()) return null
          return <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>{renderFormattedInlineText(part)}</span>
        })}
      </>
    )
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{renderFormattedInlineText(cleanText)}</span>
}

export const isAnswerCorrect = (userAns: any, correctAns: any, sectionTypeOrSection?: string | any, qType?: string): boolean => {
  if (userAns === undefined || userAns === null || userAns === '' || correctAns === undefined || correctAns === null || correctAns === '') {
    return false
  }

  const sectionType = typeof sectionTypeOrSection === 'string'
    ? sectionTypeOrSection
    : (sectionTypeOrSection?.type || '')
  const sectionObj = typeof sectionTypeOrSection === 'object' && sectionTypeOrSection !== null
    ? sectionTypeOrSection
    : null
  const wordbank = sectionObj?.wordbank || sectionObj?.options

  if (sectionType === 'multiple-choice' || sectionType === 'cloze-passage' || (sectionType === 'reading-comprehension' && qType === 'multiple-choice')) {
    if (!isNaN(Number(userAns)) && !isNaN(Number(correctAns))) {
      return Number(userAns) === Number(correctAns)
    }
  }

  if (sectionType === 'true-false') {
    return String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase()
  }

  if (sectionType === 'reading-comprehension' && qType === 'short-answer') {
    if (correctAns !== undefined && correctAns !== null && String(correctAns).trim().length > 0) {
      const u = String(userAns || '').trim().toLowerCase()
      const c = String(correctAns || '').trim().toLowerCase()
      if (u === c) return true
      if (c === '11' && (u === '11' || u === 'eleven')) return true
      if (c === 'eleven' && (u === '11' || u === 'eleven')) return true
      return false
    }
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

  // Wordbank / options index vs string comparison
  if (wordbank && Array.isArray(wordbank)) {
    // If correctAns is a numeric index (e.g. 2)
    if (!isNaN(Number(correctAns)) && typeof correctAns !== 'boolean') {
      const targetIdx = Number(correctAns)
      if (targetIdx >= 0 && targetIdx < wordbank.length) {
        const targetWord = wordbank[targetIdx]
        // Compare with user string or user index
        if (!isNaN(Number(userAns)) && Number(userAns) === targetIdx) return true
        if (String(userAns).trim().toLowerCase() === String(targetWord).trim().toLowerCase()) return true
      }
    }
    // If userAns is a numeric index (e.g. 2) but correctAns is a string
    if (!isNaN(Number(userAns)) && typeof userAns !== 'boolean') {
      const uIdx = Number(userAns)
      if (uIdx >= 0 && uIdx < wordbank.length) {
        const userWord = wordbank[uIdx]
        if (String(userWord).trim().toLowerCase() === String(correctAns).trim().toLowerCase()) return true
      }
    }
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
