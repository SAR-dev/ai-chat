const DB_NAME = 'kikuchat-images'
const DB_VERSION = 1
const STORE_NAME = 'generated-images'

interface ImageRecord {
  key: string // `${sessionId}:${assistantMessageId}`
  images: Array<{ b64: string; prompt?: string; caption?: string; width?: number; height?: number }>
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

export async function storeImages(
  sessionId: string,
  assistantMessageId: number | null,
  images: ImageRecord['images'],
): Promise<void> {
  if (!assistantMessageId) return
  const key = `${sessionId}:${assistantMessageId}`
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ key, images })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getStoredImages(
  sessionId: string,
  assistantMessageId: number | null,
): Promise<ImageRecord['images'] | null> {
  if (!assistantMessageId) return null
  const key = `${sessionId}:${assistantMessageId}`
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve((req.result as ImageRecord)?.images ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearStoredImages(sessionId: string): Promise<void> {
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
