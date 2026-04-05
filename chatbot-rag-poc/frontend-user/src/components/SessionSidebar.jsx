import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Plus, MessageSquare, Trash2, LogOut, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function SessionSidebar() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const fetchSessions = async () => {
    try {
      const response = await api.get('/chat/sessions')
      setSessions(response.data)
    } catch (err) {
      console.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleNewChat = () => {
    navigate('/')
  }

  const handleSessionClick = (sessionId) => {
    navigate(`/?session=${sessionId}`)
  }

  const handleDeleteClick = (e, session) => {
    e.stopPropagation()
    setSessionToDelete(session)
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    if (!sessionToDelete) return
    try {
      await api.delete(`/chat/sessions/${sessionToDelete.id}`)
      fetchSessions()
      navigate('/')
    } catch (err) {
      console.error('Failed to delete session')
    }
    setShowConfirm(false)
    setSessionToDelete(null)
  }

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = (now - date) / 1000

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <aside className="w-72 bg-gray-900 text-white flex flex-col border-r border-gray-800">
      <div className="p-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewChat}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-emerald-600 hover:to-teal-700 font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {loading ? (
          <div className="p-4 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No conversations yet
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => handleSessionClick(session.id)}
                  className="group relative p-3 hover:bg-gray-800 cursor-pointer transition rounded-lg"
                >
                  <div className="flex items-start gap-3 pr-8">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-200">{session.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatRelativeTime(session.updated_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, session)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition p-1.5 rounded hover:bg-gray-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="bg-gray-800 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 py-2 px-3 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-gray-700"
            >
              <h3 className="text-lg font-bold mb-2">Delete Conversation?</h3>
              <p className="text-gray-400 mb-6 text-sm">This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}

export default SessionSidebar
