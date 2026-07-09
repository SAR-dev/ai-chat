/**
 * Manages "pinned" chat sessions entirely on the client (IndexedDB).
 * No backend call is involved — pin state is a local UI preference tied
 * to this browser/device, stored the same way generated images are
 * (see imageStore.ts).
 */

const DB_NAME = 'kikuchat-pinned-sessions'
const DB_VERSION = 1
const STORE_NAME = 'pinned-sessions'

interface PinnedRecord {
  sessionId: string
  pinned: true
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getPinnedIds(): Promise<Set<string>> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAllKeys()
      req.onsuccess = () => resolve(new Set(req.result as string[]))
      req.onerror = () => reject(req.error)
    })
  } catch {
    // IndexedDB unavailable (private browsing, disabled, etc.) — treat as no pins.
    return new Set()
  }
}

export async function isSessionPinned(sessionId: string): Promise<boolean> {
  const ids = await getPinnedIds()
  return ids.has(sessionId)
}

export async function setSessionPinned(sessionId: string, pinned: boolean): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      if (pinned) {
        store.put({ sessionId, pinned: true } as PinnedRecord)
      } else {
        store.delete(sessionId)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Best-effort persistence — pin state just won't stick if IndexedDB isn't available.
  }
}

/** Overlays local pin state onto a list of sessions fetched from the backend. */
export async function applyPinnedState<T extends { id: string; pinned?: boolean }>(
  sessions: T[],
): Promise<T[]> {
  const pinnedIds = await getPinnedIds()
  return sessions.map((session) => ({
    ...session,
    pinned: pinnedIds.has(session.id),
  }))
}

/** Removes a session's pin record, e.g. after the session itself is deleted. */
export async function clearSessionPinned(sessionId: string): Promise<void> {
  await setSessionPinned(sessionId, false)
}
