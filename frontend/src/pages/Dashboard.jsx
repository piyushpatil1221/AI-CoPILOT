import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Upload, ArrowRight, FileText, Clock, Trash2,
  BarChart3, MessageSquare, GitCompare, TrendingUp, Shield, Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSessions, deleteSession, createSession } from '@/lib/api'
import UploadZone from '@/components/UploadZone'

const FEATURES = [
  { icon: BarChart3,     title: 'AI Analysis',       desc: 'SWOT, risks, financials, growth — in seconds' },
  { icon: MessageSquare, title: 'Chat with Docs',     desc: 'Ask anything with streaming answers & citations' },
  { icon: GitCompare,    title: 'Company Compare',   desc: 'Side-by-side metrics with AI recommendation' },
  { icon: TrendingUp,    title: 'Investment Signal', desc: 'BUY / HOLD / SELL with confidence score' },
  { icon: Shield,        title: 'Risk Detection',    desc: 'Automated red flag identification' },
  { icon: Zap,           title: 'Gemini + GPT-4o',  desc: 'Dual-provider AI with seamless fallback' },
]

function SessionCard({ session, isCurrent, onSelect, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onSelect(session.session_id)}
      className={`card-sm cursor-pointer hover:border-brand-500/40 transition-all duration-200 hover:shadow-glow-sm group
        ${isCurrent ? 'border-brand-500/40 bg-brand-600/10' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
            <FileText size={15} className="text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session.name}</p>
            <p className="text-xs text-slate-500">{session.document_count} document{session.document_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(session.session_id) }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 transition-all"
        >
          <Trash2 size={13} className="text-red-400" />
        </button>
      </div>
      <div className="flex items-center gap-1 mt-2">
        <Clock size={10} className="text-slate-600" />
        <p className="text-xs text-slate-600">
          {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </motion.div>
  )
}

export default function Dashboard({ sessions, currentSession, onSessionChange, onSessionsChange }) {
  const [showUpload, setShowUpload] = useState(false)
  const [activeSessionForUpload, setActiveSessionForUpload] = useState(null)
  const navigate = useNavigate()

  const handleNewSession = async () => {
    const name = `Session ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    const s = await createSession(name)
    const newSession = { ...s, documents: [], document_count: 0, created_at: new Date().toISOString() }
    onSessionsChange(prev => [newSession, ...prev])
    onSessionChange(s.session_id)
    setActiveSessionForUpload(s.session_id)
    setShowUpload(true)
  }

  const handleUploadComplete = (result) => {
    onSessionsChange(prev => prev.map(s =>
      s.session_id === result.session_id
        ? { ...s, document_count: s.document_count + 1, documents: [...(s.documents || []), result.filename] }
        : s
    ))
  }

  const handleDelete = async (sid) => {
    await deleteSession(sid)
    onSessionsChange(prev => prev.filter(s => s.session_id !== sid))
    if (currentSession === sid) onSessionChange(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden mb-8"
      >
        <div className="absolute inset-0 bg-mesh-gradient opacity-60" />
        <div className="relative glass p-8 lg:p-10 rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-medium">
              ✦ AI-Powered Due Diligence
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-3 leading-tight">
            Analyse Financial Documents<br />
            <span className="gradient-text">with AI Precision</span>
          </h1>
          <p className="text-slate-400 max-w-xl mb-6 text-sm leading-relaxed">
            Upload annual reports, investor decks, and financial statements.
            Get instant AI-powered insights with citations, SWOT analysis, risk assessment, and investment recommendations.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleNewSession} className="btn-primary flex items-center gap-2">
              <Upload size={16} /> Upload Documents
            </button>
            {sessions.length > 0 && (
              <button onClick={() => navigate('/analysis')} className="btn-secondary flex items-center gap-2">
                <BarChart3 size={16} /> View Analysis <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Upload zone */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Upload Documents</h2>
              <button onClick={() => setShowUpload(false)} className="btn-ghost text-sm">
                Done
              </button>
            </div>
            <UploadZone
              sessionId={activeSessionForUpload || currentSession}
              onUploadComplete={handleUploadComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions grid */}
      {sessions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Sessions</h2>
            <button onClick={handleNewSession} className="btn-ghost text-sm flex items-center gap-1">
              <Plus size={14} /> New Session
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence>
              {sessions.map(s => (
                <SessionCard
                  key={s.session_id}
                  session={s}
                  isCurrent={currentSession === s.session_id}
                  onSelect={onSessionChange}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Features grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">What you can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card-sm hover:border-brand-500/30 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center mb-3">
                <Icon size={18} className="text-brand-400" />
              </div>
              <p className="font-semibold text-white text-sm mb-1">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
