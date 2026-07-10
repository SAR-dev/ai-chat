import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import FilePreview from '@/components/FilePreview'
import { useChatStore } from '@/stores/chatStore'
import {
  SendHorizonal,
  CircleStop,
  Paperclip,
  ChevronDown,
  Zap,
  Brain,
  Presentation,
  Palette,
  FolderOpen,
  Globe,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'

const MODES = [
  { id: 'fast', name: 'Fast', description: 'Quick, everyday replies', icon: Zap },
  { id: 'thinking', name: 'Think', description: 'Reasons longer for harder problems', icon: Brain },
] as const

const SLIDE_STYLES = [
  { id: 'standard', name: 'Standard', description: 'Clean, minimal layouts', icon: Presentation },
  { id: 'creative', name: 'Creative', description: 'Bolder visuals and layout', icon: Palette },
] as const

interface PendingFile {
  id: string
  file: File
  progress: number
  preview?: string
}

interface ChatInputProps {
  sessionId?: string
  variant?: 'default' | 'hero'
  className?: string
  category?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
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

const MIN_TEXTAREA_HEIGHT = 56
const MAX_TEXTAREA_HEIGHT = 200

export default function ChatInput({
  sessionId,
  variant = 'default',
  className,
  category,
}: ChatInputProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rawId = useId()
  const inputId = `file-upload-input-${rawId.replace(/[:]/g, '')}`
  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [mode, setMode] = useState<string>(MODES[0].id)
  const [slideStyle, setSlideStyle] = useState<string>(SLIDE_STYLES[0].id)
  const [internetSearch, setInternetSearch] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('normalChat')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendChatMessage = useChatStore((s) => s.sendChatMessage)
  const sendRagMessage = useChatStore((s) => s.sendRagMessage)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const isLoading = useChatStore((s) => s.messagesStatus == 'loading')
  const categories = useChatStore((s) => s.categories)
  const fetchCategories = useChatStore((s) => s.fetchCategories)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

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

  const isTouchDevice = useCallback(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  )

  const disabled = isLoading

  // Autofocus on mount / when switching conversations, and again once the
  // input re-enables after sending -- so the user can keep typing without
  // having to click back into the box. Skipped on touch devices so we don't
  // pop the mobile keyboard open unprompted.
  useEffect(() => {
    if (!disabled && !isTouchDevice()) {
      textareaRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, disabled])

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id == id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const executeSend = useCallback(
    async (content: string) => {
      const modeVal = mode as 'fast' | 'thinking'
      const cat = selectedCategory !== 'normalChat' ? selectedCategory : (category ?? 'normalChat')

      if (cat && cat !== 'normalChat') {
        const newSessionId = sessionId ?? null
        await sendRagMessage(
          newSessionId,
          content,
          cat,
          {
            mode: modeVal,
            top_k: '5',
            internet_search: internetSearch,
            agent_mode: agentMode,
          },
          newSessionId == null ? (id) => navigate(`/chat/${id}`) : undefined,
        )
      } else {
        const targetSessionId = sessionId ?? null
        await sendChatMessage(
          targetSessionId,
          content,
          {
            mode: modeVal,
            slide_mode: slideStyle as 'standard' | 'creative',
            internet_search: internetSearch,
            agent_mode: agentMode,
          },
          targetSessionId == null ? (id) => navigate(`/chat/${id}`) : undefined,
        )
      }
    },
    [
      sessionId,
      navigate,
      sendChatMessage,
      sendRagMessage,
      mode,
      slideStyle,
      internetSearch,
      agentMode,
      category,
      selectedCategory,
    ],
  )

  const handleSend = useCallback(async () => {
    if (isStreaming) return

    const content = input.trim()
    if (!content && pendingFiles.length == 0) return

    setInput('')
    setPendingFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`
    }

    await executeSend(content)
  }, [input, pendingFiles, isStreaming, executeSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key == 'Enter' && !e.shiftKey) {
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

  const canSend = !disabled && !isStreaming && (input.trim().length > 0 || pendingFiles.length > 0)
  const isHero = variant == 'hero'
  const activeMode = MODES.find((m) => m.id == mode) ?? MODES[0]
  const activeSlideStyle = SLIDE_STYLES.find((s) => s.id == slideStyle) ?? SLIDE_STYLES[0]
  const ActiveModeIcon = activeMode.icon
  const ActiveSlideIcon = activeSlideStyle.icon

  return (
    <div
      {...getRootProps()}
      className={cn(
        'bg-background px-4 pt-2 pb-4',
        isHero && 'bg-transparent px-0 py-0',
        className,
      )}
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
            'border-border bg-card focus-within:border-primary/60 focus-within:ring-primary/15 rounded-lg border shadow-sm transition-all focus-within:ring-4',
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

          <div className="flex items-center justify-between p-2">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => document.getElementById(inputId)?.click()}
                disabled={disabled}
                className="shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      className="text-muted-foreground min-w-0 shrink gap-1 rounded-full px-2"
                    />
                  }
                >
                  <ActiveModeIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{activeMode.name}</span>
                  <span className="bg-border mx-0.5 h-3 w-px shrink-0" />
                  <ActiveSlideIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{activeSlideStyle.name}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1">
                  <DropdownMenuRadioGroup value={mode} onValueChange={setMode} className="pb-1">
                    <DropdownMenuLabel>Mode</DropdownMenuLabel>
                    {MODES.map((option) => {
                      const Icon = option.icon
                      return (
                        <DropdownMenuRadioItem key={option.id} value={option.id}>
                          <Icon className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{option.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </div>
                        </DropdownMenuRadioItem>
                      )
                    })}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={slideStyle}
                    onValueChange={setSlideStyle}
                    className="pb-1"
                  >
                    <DropdownMenuLabel>Slide</DropdownMenuLabel>
                    {SLIDE_STYLES.map((option) => {
                      const Icon = option.icon
                      return (
                        <DropdownMenuRadioItem key={option.id} value={option.id}>
                          <Icon className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span>{option.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {option.description}
                            </span>
                          </div>
                        </DropdownMenuRadioItem>
                      )
                    })}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Globe className="h-3.5 w-3.5" />
                      Internet Search
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={internetSearch}
                      onClick={() => setInternetSearch(!internetSearch)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        internetSearch ? 'bg-primary' : 'bg-input'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          internetSearch ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Bot className="h-3.5 w-3.5" />
                      Agent Mode
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={agentMode}
                      onClick={() => setAgentMode(!agentMode)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        agentMode ? 'bg-primary' : 'bg-input'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                          agentMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {categories.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <DropdownMenuLabel>Category</DropdownMenuLabel>
                        <DropdownMenuRadioItem value="normalChat">
                          <Zap className="h-4 w-4" />
                          <span>Normal Chat</span>
                        </DropdownMenuRadioItem>
                        {categories.map((cat) => (
                          <DropdownMenuRadioItem key={cat.name} value={cat.name}>
                            <FolderOpen className="h-4 w-4" />
                            <span className="capitalize">{cat.name}</span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <input
              id={inputId}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept={ALLOWED_TYPES.join(',')}
            />

            {isStreaming ? (
              <Button variant="secondary" size="icon-sm" disabled className="shrink-0">
                <CircleStop className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSend} size="icon-sm" disabled={!canSend} className="shrink-0">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-muted-foreground/70 mt-2 text-center text-xs">{t('chat.disclaimer')}</p>
      </div>
    </div>
  )
}
