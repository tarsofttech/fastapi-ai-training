import React, { useState, useRef } from 'react'
import { Upload, File, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function UploadZone({ onUpload, uploading }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const inputRef = useRef(null)

  const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (['pdf', 'txt', 'docx'].includes(ext)) {
      setSelectedFile(file)
    } else {
      alert('Only PDF, TXT, and DOCX files are allowed')
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      setSelectedFile(null)
    }
  }

  const onButtonClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-700 hover:border-slate-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.docx"
          onChange={handleChange}
        />
        
        <div className="flex flex-col items-center">
          <div className={`p-4 rounded-full mb-4 transition-colors ${
            dragActive ? 'bg-blue-500/20' : 'bg-slate-800'
          }`}>
            <Upload className={`w-8 h-8 ${dragActive ? 'text-blue-400' : 'text-slate-400'}`} />
          </div>
          
          <p className="text-slate-300 mb-2 text-sm">
            Drag and drop your file here, or{' '}
            <button
              onClick={onButtonClick}
              className="text-blue-400 hover:text-blue-300 font-medium underline"
            >
              browse
            </button>
          </p>
          <p className="text-slate-500 text-xs">
            Supported formats: PDF, TXT, DOCX
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center justify-between bg-slate-800 border border-slate-700 p-4 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <File className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {!uploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-all"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UploadZone
