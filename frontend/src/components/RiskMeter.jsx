import { motion } from 'framer-motion'
import { AlertTriangle, AlertOctagon, Info, Flame } from 'lucide-react'

const LEVEL_CONFIG = {
  low:      { color: '#10b981', bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', icon: Info,          label: 'Low Risk' },
  medium:   { color: '#f59e0b', bg: 'bg-yellow-500/15  border-yellow-500/30',  text: 'text-yellow-400', icon: AlertTriangle, label: 'Medium Risk' },
  high:     { color: '#f97316', bg: 'bg-orange-500/15  border-orange-500/30',  text: 'text-orange-400', icon: AlertOctagon,  label: 'High Risk' },
  critical: { color: '#ef4444', bg: 'bg-red-500/15     border-red-500/30',     text: 'text-red-400',    icon: Flame,         label: 'Critical Risk' },
}

export function RiskBadge({ level }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.medium
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

export default function RiskMeter({ risks }) {
  if (!risks?.length) return <p className="text-slate-500 text-sm">No risk factors identified.</p>
  return (
    <div className="space-y-3">
      {risks.map((risk, i) => {
        const cfg = LEVEL_CONFIG[risk.level] || LEVEL_CONFIG.medium
        const Icon = cfg.icon
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.text}`}
              style={{ background: cfg.color + '22' }}>
              <Icon size={16} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-white">{risk.title}</h4>
                <RiskBadge level={risk.level} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{risk.description}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
