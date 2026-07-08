import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResult {
  sessionId: string
  title: string
  snippet: string
}

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const sessions = useChatStore((s) => s.sessions)
  const messagesBySessionId = useChatStore((s) => s.messagesBySessionId)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const results = ((): SearchResult[] => {
    if (!query.trim()) return []

    const q = query.toLowerCase().trim()
    const seen = new Set<string>()
    const items: SearchResult[] = []

    const addResult = (sessionId: string, title: string, snippet: string) => {
      if (seen.has(sessionId)) return
      seen.add(sessionId)
      items.push({ sessionId, title, snippet })
    }

    for (const session of sessions) {
      const titleMatch = session.title.toLowerCase().includes(q)
      if (titleMatch) {
        addResult(session.id, session.title, '')
      }
    }

    for (const [sessionId, msgs] of Object.entries(messagesBySessionId)) {
      for (const msg of msgs) {
        const idx = msg.content.toLowerCase().indexOf(q)
        if (idx !== -1) {
          const session = sessions.find((s) => s.id === sessionId)
          const title = session?.title ?? sessionId
          const start = Math.max(0, idx - 40)
          const end = Math.min(msg.content.length, idx + q.length + 40)
          const snippet = (start > 0 ? '…' : '') + msg.content.slice(start, end) + (end < msg.content.length ? '…' : '')
          addResult(sessionId, title, snippet)
          break
        }
      }
    }

    return items
  })()

  const handleSelect = (sessionId: string) => {
    navigate(`/chat/${sessionId}`)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="bg-popover text-popover-foreground relative z-50 w-full max-w-lg rounded-xl border shadow-2xl">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sidebar.search')}
          className="w-full rounded-t-xl border-0 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-gray-400"
        />
        <div className="border-t px-2 py-2">
          {query.trim() && results.length === 0 && (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
              {t('common.noResults')}
            </p>
          )}
          {results.map((result) => (
            <button
              key={result.sessionId}
              type="button"
              className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent"
              onClick={() => handleSelect(result.sessionId)}
            >
              <span className="font-medium">{result.title}</span>
              {result.snippet && (
                <span className="text-muted-foreground line-clamp-1 text-xs">{result.snippet}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
