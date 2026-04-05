import React from 'react'
import SourceBadge from './SourceBadge'
import { User, Bot } from 'lucide-react'
import { motion } from 'framer-motion'

function MessageBubble({ role, content, sources, isStreaming }) {
  const isUser = role === 'user'

  const formatContent = (text) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      
      <div className="flex-1 max-w-3xl">
        <div className={`${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-100'
        } px-4 py-3 rounded-2xl`}>
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {formatContent(content)}
            {isStreaming && (
              <span className="inline-block w-1.5 h-5 bg-emerald-400 ml-1 animate-pulse rounded"></span>
            )}
          </div>
          
          {!isUser && sources && sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-700">
              {sources.map((source, index) => (
                <SourceBadge
                  key={index}
                  filename={source.filename}
                  score={source.score}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default MessageBubble
