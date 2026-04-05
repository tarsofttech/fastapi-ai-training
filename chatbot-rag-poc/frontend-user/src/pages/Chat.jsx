import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import MessageBubble from '../components/MessageBubble'
import SourceBadge from '../components/SourceBadge'
import { Send, Sparkles, FileText, Zap, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [sources, setSources] = useState([])
  const messagesEndRef = useRef(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSessionId = searchParams.get('session')

  useEffect(() => {
    if (urlSessionId) {
      loadSession(urlSessionId)
    } else {
      setMessages([])
      setSessionId(null)
      setSources([])
    }
  }, [urlSessionId])

  const loadSession = async (id) => {
    try {
      setLoading(true)
      const response = await api.get(`/chat/sessions/${id}`)
      const { messages: sessionMessages } = response.data
      setMessages(sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources || []
      })))
      setSessionId(id)
    } catch (err) {
      console.error('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || streaming) return

    const userMessage = input.trim()
    setInput('')
    setStreaming(true)
    setSources([])

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      sources: []
    }])

    let currentResponse = ''
    let newSessionId = null
    let messageSources = []

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId
        }),
        credentials: 'include'
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        sources: [],
        isStreaming: true
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'token') {
                currentResponse += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = currentResponse
                  }
                  return newMessages
                })
              } else if (data.type === 'sources') {
                messageSources = data.sources
                setSources(data.sources)
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = newMessages[newMessages.length - 1]
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.sources = data.sources
                  }
                  return newMessages
                })
              } else if (data.type === 'done') {
                newSessionId = data.session_id
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      if (newSessionId) {
        setSessionId(newSessionId)
        if (!urlSessionId) {
          setSearchParams({ session: newSessionId })
        }
      }

      setMessages(prev => {
        const newMessages = [...prev]
        const lastMsg = newMessages[newMessages.length - 1]
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.isStreaming = false
        }
        return newMessages
      })

    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        sources: []
      }])
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl w-full text-center"
            >
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                How can I help you today?
              </h1>
              <p className="text-gray-400 text-lg mb-12">
                Ask me anything about your company documents
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-left cursor-pointer hover:border-gray-700 transition"
                  onClick={() => setInput("What are the company policies?")}
                >
                  <FileText className="w-5 h-5 text-emerald-500 mb-2" />
                  <p className="text-white text-sm font-medium">Company Policies</p>
                  <p className="text-gray-500 text-xs mt-1">Learn about our guidelines</p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-left cursor-pointer hover:border-gray-700 transition"
                  onClick={() => setInput("How do I submit a request?")}
                >
                  <Zap className="w-5 h-5 text-emerald-500 mb-2" />
                  <p className="text-white text-sm font-medium">Quick Actions</p>
                  <p className="text-gray-500 text-xs mt-1">Get things done faster</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-8">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                sources={message.sources}
                isStreaming={message.isStreaming}
              />
            ))}

            {streaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <div className="flex gap-4 mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="flex gap-1 items-center mt-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your AI assistant..."
              className="w-full px-4 py-4 pr-12 bg-gray-900 border border-gray-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-gray-500 transition"
              rows={1}
              disabled={streaming}
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="absolute right-3 bottom-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {streaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-center text-gray-600 text-xs mt-3">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Chat
