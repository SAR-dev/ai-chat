import { useEffect, useRef, useState, useCallback } from 'react'

interface UseChatScrollOptions {
  viewportRef: React.RefObject<HTMLDivElement | null>
  // The inner content wrapper (the element that actually grows/shrinks as
  // messages, images, and code blocks render). Falls back to viewportRef if
  // omitted, but that won't detect growth since the viewport's own height
  // is fixed by its container.
  contentRef?: React.RefObject<HTMLDivElement | null>
  deps?: unknown[]
  // A value that identifies the current conversation (e.g. sessionId).
  // When this changes, scroll state is hard-reset and we snap to bottom,
  // regardless of whether the user had scrolled up in the *previous* conversation.
  resetKey?: string | number
}

export function useChatScroll({ viewportRef, contentRef, deps = [], resetKey }: UseChatScrollOptions) {
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showJumpButton, setShowJumpButton] = useState(false)
  const userScrolledUp = useRef(false)
  const mutationObserver = useRef<MutationObserver | null>(null)
  const resizeObserver = useRef<ResizeObserver | null>(null)

  const checkIfAtBottom = useCallback(() => {
    const el = viewportRef.current
    if (!el) return true
    const threshold = 100
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [viewportRef])

  const scrollToBottom = useCallback((smooth = true) => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
    userScrolledUp.current = false
    setShowJumpButton(false)
    setIsAtBottom(true)
  }, [viewportRef])

  useEffect(() => {
    const el = viewportRef.current
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

    // ResizeObserver for content growing/shrinking (e.g. late-loading images,
    // code blocks, artifacts). Must observe the inner content wrapper, not the
    // viewport itself — the viewport's height is fixed by its container, so it
    // never fires when content grows inside it.
    const resizeTarget = contentRef?.current ?? el
    resizeObserver.current = new ResizeObserver(() => {
      if (!userScrolledUp.current) {
        scrollToBottom(false)
      }
    })
    resizeObserver.current.observe(resizeTarget)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      mutationObserver.current?.disconnect()
      resizeObserver.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, checkIfAtBottom, scrollToBottom])

  // Hard reset when switching conversations: a "scrolled up" state from the
  // previous conversation must never carry over and suppress auto-scroll here.
  useEffect(() => {
    if (resetKey == undefined) return
    userScrolledUp.current = false
    // Snap (no smooth animation) once the new conversation's messages are in the DOM.
    // scrollToBottom(false) also resets showJumpButton/isAtBottom, so no need to set them here.
    scrollToBottom(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  // Auto-scroll when deps change (new messages etc)
  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps])

  return { isAtBottom, showJumpButton, scrollToBottom }
}
