import { useState, useRef, useCallback, useEffect } from 'react'
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
  sessionId: string
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

export default function ChatInput({ sessionId }: ChatInputProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
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
      textareaRef.current.style.height = 'auto'
    }
    await sendMessageStreaming(sessionId, content)
  }, [input, pendingFiles, sessionId, sendMessageStreaming])

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

  const disabled = isStreaming || isLoading

  return (
    <div
      {...getRootProps()}
      className={cn('border-border bg-background border-t p-4', isDragActive && 'bg-primary/5')}
    >
      {isDragActive && (
        <div className="border-primary text-primary mb-2 rounded-lg border-2 border-dashed p-4 text-center text-sm">
          {t('upload.dragDrop')}
        </div>
      )}
      <input {...getInputProps()} />
      <FilePreview files={pendingFiles} onRemove={removeFile} className="mb-2" />
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => document.getElementById('file-upload-input')?.click()}
          disabled={disabled}
          className="shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          id="file-upload-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInput}
          accept={ALLOWED_TYPES.join(',')}
        />
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.inputPlaceholder')}
          rows={1}
          disabled={disabled}
          className="max-h-[200px] min-h-10 resize-none"
        />
        {isStreaming ? (
          <Button variant="outline" size="icon" onClick={stopStreaming} className="shrink-0">
            <StopCircle className="h-5 w-5" weight="fill" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            size="icon"
            disabled={disabled || (!input.trim() && pendingFiles.length === 0)}
            className="shrink-0"
          >
            <PaperPlaneRight className="h-5 w-5" weight="fill" />
          </Button>
        )}
      </div>
    </div>
  )
}
