import { useState, useCallback } from 'react'
import { analyzeSession } from '@/lib/api'

/**
 * useAnalysis — manages analysis state for a session.
 */
export function useAnalysis(sessionId) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runAnalysis = useCallback(async (provider = null, sections = null) => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeSession(sessionId, provider)
      setReport(data)
      return data
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Analysis failed'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const reset = useCallback(() => {
    setReport(null)
    setError(null)
  }, [])

  return { report, loading, error, runAnalysis, reset }
}
