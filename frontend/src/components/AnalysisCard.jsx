import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export function ConfidenceRing({ value, size = 56 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const dash = circ * pct
  const color = pct >= 0.75 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1s ease-out' }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize={size * 0.22} fontWeight={600}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

export function FinancialHighlights({ highlights }) {
  if (!highlights?.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {highlights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="card-sm flex flex-col gap-1"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wide">{h.metric}</p>
          <p className="text-lg font-bold text-white">{h.value}</p>
          <div className="flex items-center gap-1">
            {h.trend === 'up'      && <TrendingUp size={12}  className="text-emerald-400" />}
            {h.trend === 'down'    && <TrendingDown size={12} className="text-red-400" />}
            {h.trend === 'neutral' && <Minus size={12}        className="text-slate-400" />}
            <span className={`text-xs ${
              h.trend === 'up' ? 'text-emerald-400' :
              h.trend === 'down' ? 'text-red-400' : 'text-slate-400'
            }`}>{h.note || h.trend}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function AnalysisCard({ title, icon: Icon, children, badge, defaultOpen = true, confidence }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
              <Icon size={18} className="text-brand-400" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            {badge && <span className="text-xs text-slate-500">{badge}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {confidence !== undefined && <ConfidenceRing value={confidence} size={44} />}
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 prose-dark"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
