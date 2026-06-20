import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitCompare, Loader2, AlertCircle, Trophy, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { compareCompanies } from '@/lib/api'
import CompareTable from '@/components/CompareTable'
import ReactMarkdown from 'react-markdown'

export default function Compare({ sessions }) {
  const [sessionA, setSessionA] = useState('')
  const [sessionB, setSessionB] = useState('')
  const [provider, setProvider] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sessionsWithDocs = sessions.filter(s => s.document_count > 0)

  const handleCompare = async () => {
    if (!sessionA || !sessionB || sessionA === sessionB) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const data = await compareCompanies(sessionA, sessionB, provider || null)
      setReport(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const nameA = sessions.find(s => s.session_id === sessionA)?.name || 'Company A'
  const nameB = sessions.find(s => s.session_id === sessionB)?.name || 'Company B'

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Company Comparison</h1>
        <p className="text-slate-500 text-sm mt-1">Compare two companies side-by-side with AI analysis</p>
      </div>

      {/* Selector card */}
      <div className="card mb-6">
        <h2 className="font-semibold text-white mb-4">Select Companies to Compare</h2>

        {sessionsWithDocs.length < 2 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={18} className="text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-300">
              You need at least 2 sessions with uploaded documents to compare.
              Upload documents to 2 separate sessions first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company A */}
              <div>
                <label className="block text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                  Company A
                </label>
                <select
                  value={sessionA}
                  onChange={e => setSessionA(e.target.value)}
                  className="input-base"
                >
                  <option value="">Select a session…</option>
                  {sessionsWithDocs.filter(s => s.session_id !== sessionB).map(s => (
                    <option key={s.session_id} value={s.session_id}>{s.name} ({s.document_count} docs)</option>
                  ))}
                </select>
              </div>

              {/* VS divider */}
              <div className="hidden sm:flex items-end justify-center pb-3">
                <div className="w-10 h-10 rounded-full bg-surface-800 border border-white/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-400">VS</span>
                </div>
              </div>

              {/* Company B */}
              <div>
                <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">
                  Company B
                </label>
                <select
                  value={sessionB}
                  onChange={e => setSessionB(e.target.value)}
                  className="input-base"
                >
                  <option value="">Select a session…</option>
                  {sessionsWithDocs.filter(s => s.session_id !== sessionA).map(s => (
                    <option key={s.session_id} value={s.session_id}>{s.name} ({s.document_count} docs)</option>
                  ))}
                </select>
              </div>
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
                onClick={handleCompare}
                disabled={!sessionA || !sessionB || sessionA === sessionB || loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Comparing…</>
                  : <><GitCompare size={16} /> Compare Companies</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="card text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <GitCompare size={28} className="text-brand-400" />
              </motion.div>
            </div>
            <h3 className="text-white font-semibold mb-1">Comparing {nameA} vs {nameB}…</h3>
            <p className="text-slate-500 text-sm">Analysing documents and generating comparison metrics</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="card flex items-start gap-3 border-red-500/20 bg-red-500/5 mb-4">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-300">Comparison Failed</p>
            <p className="text-sm text-red-400/70 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Report */}
      <AnimatePresence>
        {report && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Company headers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-sm bg-brand-600/10 border-brand-500/20 text-center">
                <p className="text-xs text-brand-400 uppercase tracking-wider font-semibold mb-1">Company A</p>
                <p className="text-lg font-bold text-white">{report.session_a_name}</p>
              </div>
              <div className="card-sm bg-purple-600/10 border-purple-500/20 text-center">
                <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold mb-1">Company B</p>
                <p className="text-lg font-bold text-white">{report.session_b_name}</p>
              </div>
            </div>

            {/* Metrics table */}
            <div className="card">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <GitCompare size={18} className="text-brand-400" /> Key Metrics Comparison
              </h2>
              <CompareTable
                metrics={report.metrics}
                companyA={report.session_a_name}
                companyB={report.session_b_name}
              />
            </div>

            {/* Recommendation */}
            <div className={`card border-2 ${
              report.recommended_company === 'a' ? 'border-brand-500/40 bg-brand-600/5' :
              report.recommended_company === 'b' ? 'border-purple-500/40 bg-purple-600/5' :
              'border-white/15'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Trophy size={20} className="text-yellow-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">AI Recommendation</h2>
                  {report.recommended_company && report.recommended_company !== 'tie' && (
                    <p className={`text-sm font-bold ${report.recommended_company === 'a' ? 'text-brand-400' : 'text-purple-400'}`}>
                      Preferred: {report.recommended_company === 'a' ? report.session_a_name : report.session_b_name}
                    </p>
                  )}
                  {report.recommended_company === 'tie' && (
                    <p className="text-sm text-slate-400 font-medium">Both companies are comparable</p>
                  )}
                </div>
              </div>
              <div className="prose-dark text-sm">
                <ReactMarkdown>{report.recommendation}</ReactMarkdown>
              </div>
            </div>

            {/* Overall comparison */}
            {report.overall_comparison && (
              <div className="card">
                <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-400" /> Overall Analysis
                </h2>
                <div className="prose-dark text-sm">
                  <ReactMarkdown>{report.overall_comparison}</ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
