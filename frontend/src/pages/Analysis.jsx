import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Loader2, AlertCircle, Sparkles, RefreshCw,
  FileText, TrendingUp, Shield, Target, Lightbulb,
  Globe, DollarSign, Star, AlertOctagon, ChevronRight
} from 'lucide-react'
import { analyzeSession } from '@/lib/api'
import AnalysisCard, { FinancialHighlights, ConfidenceRing } from '@/components/AnalysisCard'
import SwotMatrix from '@/components/SwotMatrix'
import RiskMeter from '@/components/RiskMeter'
import ReactMarkdown from 'react-markdown'

const TABS = [
  { id: 'summary',     label: 'Summary',       icon: FileText },
  { id: 'swot',        label: 'SWOT',          icon: Target },
  { id: 'financials',  label: 'Financials',    icon: DollarSign },
  { id: 'risks',       label: 'Risks',         icon: Shield },
  { id: 'growth',      label: 'Growth',        icon: TrendingUp },
  { id: 'market',      label: 'Market',        icon: Globe },
  { id: 'recommend',   label: 'Recommendation',icon: Star },
]

function ScoreMeter({ score }) {
  if (score == null) return null
  const color = score >= 7 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444'
  const label = score >= 7 ? 'BUY' : score >= 5 ? 'HOLD' : 'SELL'
  const labelColor = score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-6 p-6 rounded-2xl glass">
      <svg width={100} height={100} viewBox="0 0 100 100">
        {/* Background arc */}
        <path d="M 10 80 A 40 40 0 0 1 90 80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
        {/* Score arc */}
        <motion.path
          d="M 10 80 A 40 40 0 0 1 90 80"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 10) * 125.6} 125.6`}
          initial={{ strokeDasharray: '0 125.6' }}
          animate={{ strokeDasharray: `${(score / 10) * 125.6} 125.6` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <text x="50" y="68" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">{score.toFixed(1)}</text>
        <text x="50" y="84" textAnchor="middle" fill="#64748b" fontSize="11">/10</text>
      </svg>
      <div>
        <p className="text-slate-400 text-sm mb-1">Investment Score</p>
        <p className={`text-3xl font-black ${labelColor}`}>{label}</p>
        <p className="text-slate-500 text-xs mt-1">AI Recommendation</p>
      </div>
    </div>
  )
}

export default function Analysis({ currentSession, sessions }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [provider, setProvider] = useState(null)

  const sessionName = sessions?.find(s => s.session_id === currentSession)?.name || 'Session'

  const runAnalysis = async () => {
    if (!currentSession) return
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeSession(currentSession, provider)
      setReport(data)
      setActiveTab('summary')
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 size={48} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Session Selected</h2>
          <p className="text-slate-500 text-sm">Select a session with uploaded documents to generate analysis.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">{sessionName}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={provider || ''}
            onChange={e => setProvider(e.target.value || null)}
            className="text-xs bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">Auto (Gemini)</option>
            <option value="gemini">Gemini 2.5 Flash</option>
            <option value="openai">GPT-4o</option>
          </select>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Analysing…</>
              : report
              ? <><RefreshCw size={16} /> Re-analyse</>
              : <><Sparkles size={16} /> Generate Analysis</>
            }
          </button>
        </div>
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={28} className="text-brand-400" />
              </motion.div>
            </div>
            <h3 className="text-white font-semibold mb-2">Analysing your documents…</h3>
            <p className="text-slate-500 text-sm mb-6">
              Generating executive summary, SWOT, risk assessment, financials, and investment recommendation.
            </p>
            <div className="space-y-2 max-w-xs mx-auto">
              {['Executive Summary', 'SWOT Analysis', 'Financial Highlights', 'Risk Factors', 'Investment Recommendation'].map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={12} className="animate-spin text-brand-400" />
                  {s}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="card flex items-start gap-3 border-red-500/20 bg-red-500/5">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-300">Analysis Failed</p>
            <p className="text-sm text-red-400/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl glass">
            <div className="flex items-center gap-2">
              <ConfidenceRing value={report.overall_confidence} size={48} />
              <div>
                <p className="text-xs text-slate-500">Overall Confidence</p>
                <p className="text-sm font-semibold text-white">{Math.round(report.overall_confidence * 100)}%</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-xs text-slate-500">Provider</p>
              <p className="text-sm font-semibold text-white capitalize">{report.llm_provider}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-xs text-slate-500">Model</p>
              <p className="text-sm font-semibold text-white">{report.model}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-xs text-slate-500">Citations</p>
              <p className="text-sm font-semibold text-white">{report.citations?.length || 0} sources</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-white/8 overflow-x-auto mb-6">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`tab-item flex items-center gap-1.5 ${activeTab === id ? 'active' : ''}`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {activeTab === 'summary' && (
                <>
                  <AnalysisCard title="Executive Summary" icon={FileText}>
                    <div className="prose-dark">
                      <ReactMarkdown>{report.executive_summary || 'No summary generated.'}</ReactMarkdown>
                    </div>
                  </AnalysisCard>
                  <AnalysisCard title="Business Model" icon={Globe}>
                    <div className="prose-dark">
                      <ReactMarkdown>{report.business_model || 'No business model analysis generated.'}</ReactMarkdown>
                    </div>
                  </AnalysisCard>
                </>
              )}

              {activeTab === 'swot' && (
                <AnalysisCard title="SWOT Analysis" icon={Target}>
                  <SwotMatrix swot={report.swot} />
                </AnalysisCard>
              )}

              {activeTab === 'financials' && (
                <AnalysisCard title="Financial Highlights" icon={DollarSign}>
                  <FinancialHighlights highlights={report.financial_highlights} />
                </AnalysisCard>
              )}

              {activeTab === 'risks' && (
                <>
                  <AnalysisCard title="Risk Factors" icon={Shield}>
                    <RiskMeter risks={report.risk_factors} />
                  </AnalysisCard>
                  {report.red_flags?.length > 0 && (
                    <AnalysisCard title="Red Flags" icon={AlertOctagon}>
                      <ul className="space-y-2">
                        {report.red_flags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </AnalysisCard>
                  )}
                </>
              )}

              {activeTab === 'growth' && (
                <AnalysisCard title="Growth Opportunities" icon={Lightbulb}>
                  {report.growth_opportunities?.length > 0 ? (
                    <div className="grid gap-3">
                      {report.growth_opportunities.map((opp, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                          <TrendingUp size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-slate-300">{opp}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No growth opportunities identified.</p>
                  )}
                </AnalysisCard>
              )}

              {activeTab === 'market' && (
                <AnalysisCard title="Market Position" icon={Globe}>
                  <div className="prose-dark">
                    <ReactMarkdown>{report.market_position || 'No market position analysis generated.'}</ReactMarkdown>
                  </div>
                </AnalysisCard>
              )}

              {activeTab === 'recommend' && (
                <div className="space-y-4">
                  <ScoreMeter score={report.recommendation_score} />
                  <AnalysisCard title="Investment Recommendation" icon={Star}>
                    <div className="prose-dark">
                      <ReactMarkdown>{report.investment_recommendation || 'No recommendation generated.'}</ReactMarkdown>
                    </div>
                  </AnalysisCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Citations footer */}
          {report.citations?.length > 0 && (
            <div className="mt-8 card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FileText size={16} className="text-brand-400" />
                Source Citations ({report.citations.length})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {report.citations.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-800/60 border border-white/8 text-xs">
                    <span className="text-brand-400 font-mono font-bold">[{i + 1}]</span>
                    <div>
                      <p className="text-white font-medium">{c.source}</p>
                      <p className="text-slate-500">Page {c.page} · {Math.round(c.score * 100)}% relevance</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="card text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-brand-600/15 flex items-center justify-center mx-auto mb-5">
            <BarChart3 size={36} className="text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Ready to Analyse</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Click "Generate Analysis" to get AI-powered insights including executive summary, SWOT analysis,
            risk factors, financial highlights, and investment recommendation.
          </p>
          <button onClick={runAnalysis} className="btn-primary mx-auto flex items-center gap-2 w-fit">
            <Sparkles size={16} /> Generate Full Analysis
          </button>
        </div>
      )}
    </div>
  )
}
