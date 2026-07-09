import type { SlideDeck } from '@/types'

const DB_NAME = 'kikuchat-slides'
const DB_VERSION = 1
const STORE_NAME = 'generated-slides'

interface SlideRecord {
  key: string
  slides: SlideDeck[]
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function storeSlides(
  sessionId: string,
  assistantMessageId: number | null,
  slides: SlideDeck[],
): Promise<void> {
  if (!assistantMessageId) return
  const key = `${sessionId}:${assistantMessageId}`
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ key, slides })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getStoredSlides(
  sessionId: string,
  assistantMessageId: number | null,
): Promise<SlideDeck[] | null> {
  if (!assistantMessageId) return null
  const key = `${sessionId}:${assistantMessageId}`
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve((req.result as SlideRecord)?.slides ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearStoredSlides(sessionId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const req = store.openCursor()
  req.onsuccess = () => {
    const cursor = req.result
    if (cursor) {
      const key = cursor.key as string
      if (key.startsWith(`${sessionId}:`)) {
        cursor.delete()
      }
      cursor.continue()
    }
  }
}

export async function migrateSlideKeys(oldSessionId: string, newSessionId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const req = store.openCursor()
  return new Promise((resolve) => {
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        const key = cursor.key as string
        if (key.startsWith(`${oldSessionId}:`)) {
          const record = cursor.value as SlideRecord
          const newKey = key.replace(`${oldSessionId}:`, `${newSessionId}:`)
          store.delete(key)
          store.put({ key: newKey, slides: record.slides })
        }
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => resolve()
  })
}
