import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import FilePreview from '@/components/FilePreview'
import { useChatStore } from '@/stores/chatStore'
import { PaperPlaneRight, StopCircle, Paperclip } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'

interface PendingFile {
  id: string
  file: File
  progress: number
  preview?: string
}

interface ChatInputProps {
  /** Existing session to send into. Omit to have the composer create a new
   * session on first send -- this is how the home/hero composer works. */
  sessionId?: string
  /** Renders a larger, centered composer for the "new chat" home screen. */
  variant?: 'default' | 'hero'
  className?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// Roughly two lines of text-sm content plus the textarea's own padding --
// this is the composer's resting height, so it never opens looking like a
// cramped single-line search box.
const MIN_TEXTAREA_HEIGHT = 56
const MAX_TEXTAREA_HEIGHT = 200

export default function ChatInput({ sessionId, variant = 'default', className }: ChatInputProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rawId = useId()
  const inputId = `file-upload-input-${rawId.replace(/[:]/g, '')}`
  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const createSession = useChatStore((s) => s.createSession)
  const sendMessageStreaming = useChatStore((s) => s.sendMessageStreaming)
  const stopStreaming = useChatStore((s) => s.stopStreaming)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const isLoading = useChatStore((s) => s.messagesStatus === 'loading')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: PendingFile[] = acceptedFiles.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))
    setPendingFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_FILE_SIZE,
    maxFiles: 5,
    noClick: true,
  })

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      const next = Math.min(Math.max(ta.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT)
      ta.style.height = `${next}px`
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [input, adjustHeight])

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content && pendingFiles.length === 0) return
    setInput('')
    setPendingFiles([])

    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`
    }

    let targetSessionId = sessionId
    if (!targetSessionId) {
      setIsCreatingSession(true)
      try {
        const session = await createSession()
        targetSessionId = session.id
        navigate(`/chat/${session.id}`)
      } finally {
        setIsCreatingSession(false)
      }
    }

    await sendMessageStreaming(targetSessionId, content)
  }, [input, pendingFiles, sessionId, createSession, navigate, sendMessageStreaming])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      onDrop(files)
      e.target.value = ''
    },
    [onDrop],
  )

  const disabled = isStreaming || isLoading || isCreatingSession
  const canSend = !disabled && (input.trim().length > 0 || pendingFiles.length > 0)
  const isHero = variant === 'hero'

  return (
    <div
      {...getRootProps()}
      className={cn('bg-background px-4 pt-2 pb-4', isHero && 'bg-transparent px-0 py-0', className)}
    >
      <div className={cn('mx-auto max-w-3xl', isHero && 'max-w-2xl')}>
        {isDragActive && (
          <div className="border-primary text-primary label-mono mb-2 rounded-2xl border-2 border-dashed p-4 text-center">
            {t('upload.dragDrop')}
          </div>
        )}
        <input {...getInputProps()} />
        <FilePreview files={pendingFiles} onRemove={removeFile} className="mb-2" />

        <div
          className={cn(
            'border-border bg-card focus-within:border-primary/60 focus-within:ring-primary/15 rounded-3xl border shadow-sm transition-all focus-within:ring-4',
            isDragActive && 'border-primary/60 ring-primary/15 ring-4',
            isHero && 'shadow-md',
          )}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            rows={2}
            disabled={disabled}
            style={{ height: MIN_TEXTAREA_HEIGHT }}
            className="max-h-[200px] min-h-[56px] resize-none border-0 bg-transparent px-4 pt-3.5 pb-1 text-sm shadow-none ring-0 outline-none focus-visible:ring-0"
          />

          <div className="flex items-center justify-between px-2 pb-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => document.getElementById(inputId)?.click()}
              disabled={disabled}
              className="shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              id={inputId}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept={ALLOWED_TYPES.join(',')}
            />

            {isStreaming ? (
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={stopStreaming}
                className="shrink-0"
              >
                <StopCircle className="h-4 w-4" weight="fill" />
              </Button>
            ) : (
              <Button onClick={handleSend} size="icon-sm" disabled={!canSend} className="shrink-0">
                <PaperPlaneRight className="h-4 w-4" weight="fill" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
