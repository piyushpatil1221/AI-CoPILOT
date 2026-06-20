import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Bot, User, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react'

function CitationBadge({ citation, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs bg-brand-600/20 hover:bg-brand-600/35 border border-brand-500/30 text-brand-300 rounded-full px-2 py-0.5 transition-all"
      >
        <FileText size={10} />
        [{index + 1}]
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 mt-1 w-72 p-3 rounded-xl bg-surface-800 border border-white/12 shadow-card text-xs"
        >
          <p className="font-semibold text-white mb-1">{citation.source}</p>
          <p className="text-slate-400 mb-2">Page {citation.page} · Score: {Math.round(citation.score * 100)}%</p>
          <p className="text-slate-300 leading-relaxed">{citation.text_snippet}…</p>
        </motion.div>
      )}
    </div>
  )
}

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100)
  const color = pct >= 75 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
              : pct >= 50 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
              : 'text-red-400 bg-red-500/15 border-red-500/30'
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${color}`}>
      {pct}% confident
    </span>
  )
}

export default function ChatMessage({ message }) {
  const [showCitations, setShowCitations] = useState(false)
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center
        ${isUser ? 'bg-brand-600' : 'bg-gradient-to-br from-purple-600 to-brand-600'}`}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-white" />}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-brand-600/30 border border-brand-500/30 text-white'
            : 'bg-surface-800/80 border border-white/8 text-slate-100'
        }`}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <div className={`text-sm prose-dark ${message.streaming ? 'typing-cursor' : ''}`}>
              {message.content ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: confidence + citations toggle */}
        {!isUser && !message.streaming && message.citations?.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {message.confidence !== null && <ConfidenceBadge score={message.confidence} />}
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showCitations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {message.citations.length} source{message.citations.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Citations panel */}
        {showCitations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 w-full"
          >
            {message.citations.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-800/60 border border-white/8 text-xs">
                <FileText size={13} className="text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">{c.source}</p>
                  <p className="text-slate-500">Page {c.page} · {Math.round(c.score * 100)}% match</p>
                  <p className="text-slate-400 mt-1 leading-relaxed">{c.text_snippet}…</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
