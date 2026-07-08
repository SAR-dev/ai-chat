import { useEffect, useRef, useState, useCallback } from 'react'

interface UseChatScrollOptions {
  deps?: unknown[]
}

export function useChatScroll({ deps = [] }: UseChatScrollOptions = {}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showJumpButton, setShowJumpButton] = useState(false)
  const userScrolledUp = useRef(false)
  const mutationObserver = useRef<MutationObserver | null>(null)
  const resizeObserver = useRef<ResizeObserver | null>(null)

  const checkIfAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    const threshold = 100
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
    userScrolledUp.current = false
    setShowJumpButton(false)
    setIsAtBottom(true)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const atBottom = checkIfAtBottom()
      setIsAtBottom(atBottom)
      if (!atBottom) {
        userScrolledUp.current = true
        setShowJumpButton(true)
      } else {
        userScrolledUp.current = false
        setShowJumpButton(false)
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })

    // MutationObserver for content changes
    mutationObserver.current = new MutationObserver(() => {
      if (!userScrolledUp.current) {
        scrollToBottom(false)
      }
    })
    mutationObserver.current.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    // ResizeObserver for container/dimension changes
    resizeObserver.current = new ResizeObserver(() => {
      if (!userScrolledUp.current) {
        scrollToBottom(false)
      }
    })
    resizeObserver.current.observe(el)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      mutationObserver.current?.disconnect()
      resizeObserver.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, checkIfAtBottom, scrollToBottom])

  // Auto-scroll when deps change (new messages etc)
  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps])

  return { scrollRef, isAtBottom, showJumpButton, scrollToBottom }
}
