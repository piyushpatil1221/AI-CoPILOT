import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Analysis from '@/pages/Analysis'
import Compare from '@/pages/Compare'
import { getSessions } from '@/lib/api'

export default function App() {
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)

  useEffect(() => {
    getSessions()
      .then(data => {
        setSessions(data)
        if (data.length > 0 && !currentSession) {
          setCurrentSession(data[0].session_id)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-surface-950">
        <Sidebar
          sessions={sessions}
          currentSession={currentSession}
          onSessionChange={setCurrentSession}
          onSessionsChange={setSessions}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={
              <Dashboard
                sessions={sessions}
                currentSession={currentSession}
                onSessionChange={setCurrentSession}
                onSessionsChange={setSessions}
              />
            } />
            <Route path="/chat" element={
              <Chat currentSession={currentSession} sessions={sessions} />
            } />
            <Route path="/analysis" element={
              <Analysis currentSession={currentSession} sessions={sessions} />
            } />
            <Route path="/compare" element={
              <Compare sessions={sessions} />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
