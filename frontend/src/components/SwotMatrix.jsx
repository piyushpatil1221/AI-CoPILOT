import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, TrendingUp, Zap } from 'lucide-react'

const CELLS = [
  { key: 'strengths',    label: 'Strengths',     icon: ShieldCheck,   bg: 'from-emerald-600/20 to-emerald-700/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  { key: 'weaknesses',   label: 'Weaknesses',    icon: AlertTriangle, bg: 'from-red-600/20 to-red-700/10',         border: 'border-red-500/30',     text: 'text-red-400' },
  { key: 'opportunities',label: 'Opportunities', icon: TrendingUp,    bg: 'from-blue-600/20 to-blue-700/10',       border: 'border-blue-500/30',    text: 'text-blue-400' },
  { key: 'threats',      label: 'Threats',       icon: Zap,           bg: 'from-yellow-600/20 to-yellow-700/10',   border: 'border-yellow-500/30',  text: 'text-yellow-400' },
]

export default function SwotMatrix({ swot }) {
  if (!swot) return null
  return (
    <div className="grid grid-cols-2 gap-4">
      {CELLS.map(({ key, label, icon: Icon, bg, border, text }, ci) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: ci * 0.08 }}
          className={`rounded-2xl p-4 bg-gradient-to-br ${bg} border ${border}`}
        >
          <div className={`flex items-center gap-2 mb-3 ${text}`}>
            <Icon size={16} />
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <ul className="space-y-2">
            {(swot[key] || []).map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: ci * 0.08 + i * 0.05 }}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${text} bg-current`} />
                {item.point}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  )
}
