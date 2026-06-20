import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, StopCircle, Trash2, Bot, Sparkles, AlertCircle, ChevronDown } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import ChatMessage from '@/components/ChatMessage'
import { clearChatHistory } from '@/lib/api'

const SUGGESTED = [
  'What are the major risk factors?',
  'Summarise the revenue growth trend.',
  'What is the debt-to-equity ratio?',
  'What changed compared to last year?',
  'Who are the main competitors?',
  'What are the key growth opportunities?',
]

export default function Chat({ currentSession, sessions }) {
  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } = useChat(currentSession)
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const sessionName = sessions?.find(s => s.session_id === currentSession)?.name || 'Current Session'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    const q = input.trim()
    setInput('')
    await sendMessage(q, provider)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = async () => {
    clearMessages()
    if (currentSession) await clearChatHistory(currentSession)
  }

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
            <Bot size={28} className="text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Select a Session</h2>
          <p className="text-slate-500 text-sm">Create or select a session from the sidebar, then upload documents to start chatting.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 glass-dark flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-glow-sm">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm">AI Chat</h1>
            <p className="text-xs text-slate-500">{sessionName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider toggle */}
          <select
            value={provider || ''}
            onChange={e => setProvider(e.target.value || null)}
            className="text-xs bg-surface-800 border border-white/10 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">Auto (Gemini)</option>
            <option value="gemini">Gemini 2.5 Flash</option>
            <option value="openai">GPT-4o</option>
          </select>
          {messages.length > 0 && (
            <button onClick={handleClear} className="btn-ghost flex items-center gap-1 text-xs">
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/30 to-purple-600/30 border border-brand-500/20 flex items-center justify-center mb-4 shadow-glow-sm"
            >
              <Sparkles size={26} className="text-brand-300" />
            </motion.div>
            <h2 className="text-lg font-semibold text-white mb-2">Ask anything about your documents</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm">
              I'll search through all uploaded documents and give you precise answers with source citations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="text-left text-sm px-3 py-2.5 rounded-xl bg-surface-800/60 border border-white/8 text-slate-300 hover:text-white hover:border-brand-500/40 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              <AlertCircle size={15} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 lg:px-8 border-t border-white/8 glass-dark flex-shrink-0">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about risks, revenue, strategy, comparisons…"
              rows={1}
              className="input-base resize-none min-h-[48px] max-h-[140px] pr-12 overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
              }}
            />
          </div>
          {isStreaming ? (
            <button onClick={stopStreaming} className="btn-danger flex items-center gap-2 flex-shrink-0">
              <StopCircle size={16} /> Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="btn-primary flex items-center gap-2 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p className="text-center text-xs text-slate-700 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
