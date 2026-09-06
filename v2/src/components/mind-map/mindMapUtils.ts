import md5 from 'md5'
import type { Node, SpeakerColorTheme } from './MindMapTypes'
import { SPEAKER_COLORS } from './MindMapTypes'

export const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev"

export function getAudioUrl(text: string, textbook: string, ttsBy?: string): string {
  if (!text || typeof text !== 'string') return ''
  const hash = md5(text)
  const isCf = ttsBy === 'melotts'
  return `${PUBLIC_URL_BASE}/ep/${textbook.toLowerCase()}/${isCf ? 'cf/' : ''}${hash}.mp3`
}

export function getMaxDepth(node: Node, currentDepth = 0): number {
  if (!node.children || node.children.length === 0) return currentDepth
  return Math.max(...node.children.map(child => getMaxDepth(child, currentDepth + 1)))
}

export function findNode(root: Node, id: string): Node | null {
  if (root.id === id) return root
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}

export function buildSpeakerColorMap(tree: Node): Map<string, SpeakerColorTheme> {
  const map = new Map<string, SpeakerColorTheme>()
  let index = 0
  const collectSpeakers = (node: Node) => {
    if (node.speaker && !map.has(node.speaker)) {
      const theme = SPEAKER_COLORS[index % SPEAKER_COLORS.length]
      map.set(node.speaker, theme)
      index++
    }
    if (node.children) {
      node.children.forEach(collectSpeakers)
    }
  }
  if (tree) {
    collectSpeakers(tree)
  }
  return map
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
