import { motion } from 'framer-motion'
import { Trophy, Minus, TrendingUp } from 'lucide-react'

function WinnerBadge({ winner, companyA, companyB }) {
  if (winner === 'tie') return <span className="text-xs text-slate-400 flex items-center gap-1"><Minus size={11} /> Tie</span>
  const name = winner === 'a' ? companyA : companyB
  return (
    <span className="text-xs text-yellow-400 flex items-center gap-1 font-medium">
      <Trophy size={11} /> {name}
    </span>
  )
}

export default function CompareTable({ metrics, companyA, companyB }) {
  if (!metrics?.length) return null
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-800/60">
            <th className="text-left px-4 py-3 text-slate-400 font-semibold">Metric</th>
            <th className="text-center px-4 py-3 text-brand-300 font-semibold">{companyA}</th>
            <th className="text-center px-4 py-3 text-purple-300 font-semibold">{companyB}</th>
            <th className="text-center px-4 py-3 text-slate-400 font-semibold">Winner</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`border-t border-white/5 ${
                row.winner === 'a' ? 'bg-brand-600/5' :
                row.winner === 'b' ? 'bg-purple-600/5' : ''
              }`}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-white">{row.metric}</p>
                {row.note && <p className="text-xs text-slate-500 mt-0.5">{row.note}</p>}
              </td>
              <td className={`px-4 py-3 text-center font-medium ${
                row.winner === 'a' ? 'text-brand-300' : 'text-slate-300'
              }`}>{row.company_a}</td>
              <td className={`px-4 py-3 text-center font-medium ${
                row.winner === 'b' ? 'text-purple-300' : 'text-slate-300'
              }`}>{row.company_b}</td>
              <td className="px-4 py-3 text-center">
                <WinnerBadge winner={row.winner} companyA={companyA} companyB={companyB} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
