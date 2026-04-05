import React, { useState } from 'react'
import { FileText } from 'lucide-react'

function SourceBadge({ filename, score }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative inline-block">
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700/50 text-emerald-400 rounded-lg cursor-help border border-gray-600/50 hover:bg-gray-700 transition"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <FileText className="w-3 h-3" />
        {filename}
      </span>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-gray-200 text-xs rounded-lg whitespace-nowrap z-10 border border-gray-700 shadow-lg">
          Relevance: {(score * 100).toFixed(0)}%
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-700 transform rotate-45"></div>
        </div>
      )}
    </div>
  )
}

export default SourceBadge
