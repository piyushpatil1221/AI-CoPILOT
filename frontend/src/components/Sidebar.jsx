import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, BarChart3, GitCompare,
  Plus, Trash2, ChevronLeft, ChevronRight, FileText,
  Zap, Settings, X
} from 'lucide-react'
import { createSession, deleteSession } from '@/lib/api'

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat',    icon: MessageSquare,   label: 'AI Chat' },
  { to: '/analysis',icon: BarChart3,       label: 'Analysis' },
  { to: '/compare', icon: GitCompare,      label: 'Compare' },
]

export default function Sidebar({ sessions, currentSession, onSessionChange, onSessionsChange }) {
  const [collapsed, setCollapsed] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const s = await createSession(newName.trim())
      onSessionsChange(prev => [{ ...s, documents: [], document_count: 0, created_at: new Date().toISOString() }, ...prev])
      onSessionChange(s.session_id)
      setNewName('')
      setCreating(false)
    } catch {}
  }

  const handleDelete = async (e, sid) => {
    e.stopPropagation()
    await deleteSession(sid)
    onSessionsChange(prev => prev.filter(s => s.session_id !== sid))
    if (currentSession === sid) onSessionChange(null)
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-surface-900/90 backdrop-blur-xl border-r border-white/8 z-20 flex-shrink-0"
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 z-30 w-6 h-6 rounded-full bg-brand-600 border-2 border-surface-950 flex items-center justify-center hover:bg-brand-500 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Zap size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <p className="font-bold text-sm text-white leading-tight">Due Diligence</p>
              <p className="text-xs text-brand-400">AI Copilot</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 border-b border-white/8">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
             ${isActive
               ? 'bg-brand-600/30 text-white border border-brand-500/30 shadow-glow-sm'
               : 'text-slate-400 hover:text-white hover:bg-white/6'}`
          }>
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-sm font-medium whitespace-nowrap">{label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Sessions */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden p-2"
          >
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions</span>
              <button
                onClick={() => setCreating(true)}
                className="w-6 h-6 rounded-lg bg-brand-600/20 hover:bg-brand-600/40 flex items-center justify-center transition-colors"
              >
                <Plus size={12} className="text-brand-400" />
              </button>
            </div>

            {/* New session input */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-2 mb-2"
                >
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                      placeholder="Session name…"
                      className="flex-1 bg-surface-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                    />
                    <button onClick={handleCreate} className="px-2 bg-brand-600 rounded-lg text-white text-xs hover:bg-brand-500">
                      Add
                    </button>
                    <button onClick={() => setCreating(false)} className="px-1.5 bg-white/6 rounded-lg">
                      <X size={12} className="text-slate-400" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto space-y-1">
              {sessions.map(s => (
                <button
                  key={s.session_id}
                  onClick={() => { onSessionChange(s.session_id); navigate('/') }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all duration-200 group
                    ${currentSession === s.session_id
                      ? 'bg-brand-600/20 border border-brand-500/20 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <FileText size={14} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.name}</p>
                    <p className="text-xs text-slate-600">{s.document_count} docs</p>
                  </div>
                  <button
                    onClick={e => handleDelete(e, s.session_id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={11} className="text-red-400" />
                  </button>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-xs text-slate-600 px-2 py-3 text-center">No sessions yet.<br/>Create one to start.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
