import { useRef, useCallback } from 'react'
import md5 from 'md5'
import { audioCache } from './audioCache'

export const PUBLIC_URL_BASE = 'https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev'
export const CORRECT_SFX_URL = `${PUBLIC_URL_BASE}/ep/sfx/correct.mp3`
export const ERROR_SFX_URL = `${PUBLIC_URL_BASE}/ep/sfx/error.mp3`

export const getAudioUrl = (sentence: string, book: string, isCf?: boolean) => {
    if (!sentence) return '';
    const hash = md5(sentence);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${isCf ? 'cf/' : ''}${hash}.mp3`;
}

export const getWordAudioUrl = (word: string, book: string) => {
    if (!word) return '';
    const hash = md5(word);
    return `${PUBLIC_URL_BASE}/ep/${book.toLowerCase()}/${hash}.mp3`;
}

export function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

export function usePracticeAudio(book: string, getIsCf?: () => boolean) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const sfxRef = useRef<HTMLAudioElement | null>(null)

    const resolveAudioUrl = useCallback((originalUrl: string) => {
        if (!originalUrl) return originalUrl;
        const isCf = getIsCf ? getIsCf() : false;
        if (isCf && !originalUrl.includes('/cf/')) {
            const searchStr = `/ep/${book.toLowerCase()}/`;
            return originalUrl.replace(searchStr, `${searchStr}cf/`);
        }
        return originalUrl;
    }, [book, getIsCf]);

    const playAudio = useCallback(async (url: string) => {
        if (!url) return
        const resolvedUrl = resolveAudioUrl(url)
        try {
            const blob = await audioCache.cacheAudio(resolvedUrl)
            if (!blob) return
            const blobUrl = URL.createObjectURL(blob)
            if (audioRef.current) {
                audioRef.current.src = blobUrl
                audioRef.current.onended = () => URL.revokeObjectURL(blobUrl)
                audioRef.current.play().catch(console.error)
            } else {
                const a = new Audio(blobUrl)
                a.onended = () => URL.revokeObjectURL(blobUrl)
                a.play().catch(console.error)
                audioRef.current = a
            }
        } catch (e) {
            console.error(e)
        }
    }, [resolveAudioUrl])

    const playSfx = useCallback(async (type: 'correct' | 'wrong') => {
        const url = type === 'correct' ? CORRECT_SFX_URL : ERROR_SFX_URL
        try {
            const blob = await audioCache.cacheAudio(url)
            if (!blob) return
            const blobUrl = URL.createObjectURL(blob)
            if (sfxRef.current) {
                sfxRef.current.src = blobUrl
                sfxRef.current.onended = () => URL.revokeObjectURL(blobUrl)
                sfxRef.current.play().catch(console.error)
            } else {
                const a = new Audio(blobUrl)
                a.onended = () => URL.revokeObjectURL(blobUrl)
                a.play().catch(console.error)
                sfxRef.current = a
            }
        } catch (e) {
            console.error(e)
        }
    }, [])

    return {
        audioRef,
        sfxRef,
        playAudio,
        playSfx,
        resolveAudioUrl
    }
}
