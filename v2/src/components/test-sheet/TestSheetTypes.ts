export interface AudioSpec {
  text: string
  maxReplays?: number
  url?: string
}

export interface Question {
  id: string
  prompt?: string
  answer: string | number | boolean
  options?: string[]
  translation?: string
  explanation?: string
  blankIndex?: number
  type?: 'multiple-choice' | 'short-answer'
  audio?: AudioSpec
}

export interface Section {
  id: string
  title: string
  instruction: string
  type:
    | 'fill-in-the-blank-wordbank'
    | 'fill-in-the-blank-firstletter'
    | 'multiple-choice'
    | 'definition-matching'
    | 'matching'
    | 'dialogue-completion'
    | 'cloze-passage'
    | 'true-false'
    | 'reading-comprehension'
    | 'cloze-passage-wordbank'
    | 'put-words-in-order'
    | string
  wordbank?: string[]
  options?: string[]
  passage?: string
  dialogue?: { speaker: string; text: string }[]
  audio?: AudioSpec
  questions: Question[]
}

export interface TestSheetData {
  level: string
  title: string
  sections: Section[]
}

export interface TestSheetShellProps {
  data: TestSheetData
  practiceId: string
  unit: string
  textbook: string
  initialAnswers?: Record<string, string | number | boolean>
  initialSubmitted?: boolean
  initialScore?: number
  onCloseReadOnly?: () => void
}

export interface HighlightedSentence {
  paraIdx: string | number
  sentenceIdx: number
}
