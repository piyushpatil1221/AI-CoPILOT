import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 120000, // 2 min for analysis
})

// ── Sessions ─────────────────────────────────────────────────────────────────

export const getSessions = () => api.get('/sessions').then(r => r.data)

export const createSession = (name) =>
  api.post('/sessions', { name }).then(r => r.data)

export const deleteSession = (sessionId) =>
  api.delete(`/sessions/${sessionId}`).then(r => r.data)

// ── Upload ────────────────────────────────────────────────────────────────────

export const uploadDocument = (sessionId, file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/sessions/${sessionId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  }).then(r => r.data)
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export const analyzeSession = (sessionId, llmProvider = null) =>
  api.post('/analyze', {
    session_id: sessionId,
    llm_provider: llmProvider,
  }).then(r => r.data)

// ── Chat (non-streaming) ──────────────────────────────────────────────────────

export const sendChatMessage = (sessionId, question, llmProvider = null) =>
  api.post('/chat', {
    session_id: sessionId,
    question,
    llm_provider: llmProvider,
    stream: false,
  }).then(r => r.data)

export const clearChatHistory = (sessionId) =>
  api.delete(`/chat/${sessionId}/history`).then(r => r.data)

// ── Compare ───────────────────────────────────────────────────────────────────

export const compareCompanies = (sessionIdA, sessionIdB, llmProvider = null) =>
  api.post('/compare', {
    session_id_a: sessionIdA,
    session_id_b: sessionIdB,
    llm_provider: llmProvider,
  }).then(r => r.data)

// ── Settings ──────────────────────────────────────────────────────────────────

export const switchProvider = (provider) =>
  api.post(`/settings/provider?provider=${provider}`).then(r => r.data)

export const getHealth = () => api.get('/health').then(r => r.data)

// ── Streaming chat (SSE) ──────────────────────────────────────────────────────

export const createChatStream = (sessionId, question, llmProvider = null) => {
  // We POST with fetch for SSE streaming
  return fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      question,
      llm_provider: llmProvider,
      stream: true,
    }),
  })
}
