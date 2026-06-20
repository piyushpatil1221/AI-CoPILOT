import { useState, useCallback, useRef } from 'react'
import { createChatStream } from '@/lib/api'

/**
 * useChat — manages streaming chat with SSE.
 * Yields tokens progressively and collects citations on completion.
 */
export function useChat(sessionId) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const sendMessage = useCallback(async (question, llmProvider = null) => {
    if (!question.trim() || isStreaming) return

    setError(null)

    // Add user message
    const userMsg = { role: 'user', content: question, id: Date.now() }
    setMessages(prev => [...prev, userMsg])

    // Placeholder assistant message
    const assistantId = Date.now() + 1
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '', citations: [], confidence: null, id: assistantId, streaming: true },
    ])

    setIsStreaming(true)

    try {
      const response = await createChatStream(sessionId, question, llmProvider)
      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      abortRef.current = reader

      let buffer = ''
      let fullAnswer = ''
      let citations = []
      let confidence = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const chunk = JSON.parse(raw)

            if (chunk.type === 'token') {
              fullAnswer += chunk.content
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: fullAnswer, streaming: true }
                    : m
                )
              )
            } else if (chunk.type === 'citation') {
              citations = chunk.content
            } else if (chunk.type === 'done') {
              confidence = chunk.content?.confidence ?? null
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: fullAnswer, citations, confidence, streaming: false }
                    : m
                )
              )
            } else if (chunk.type === 'error') {
              throw new Error(chunk.content)
            }
          } catch (parseErr) {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      setError(err.message)
      setMessages(prev =>
        prev.map(m =>
          m.id === Date.now() + 1
            ? { ...m, content: 'An error occurred. Please try again.', streaming: false, error: true }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [sessionId, isStreaming])

  const stopStreaming = useCallback(() => {
    abortRef.current?.cancel?.()
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages }
}
