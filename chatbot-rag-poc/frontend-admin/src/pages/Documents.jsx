import React, { useState, useEffect } from 'react'
import api from '../api/axios'
import UploadZone from '../components/UploadZone'
import ConfirmModal from '../components/ConfirmModal'
import { FileText, Upload, Trash2, Clock, CheckCircle2, XCircle, Database, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [docToDelete, setDocToDelete] = useState(null)
  const [error, setError] = useState('')
  const [pollingDocs, setPollingDocs] = useState(new Set())

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/admin/documents')
      setDocuments(response.data)
    } catch (err) {
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const processingDocs = documents.filter(d => d.status === 'processing')
      if (processingDocs.length > 0) {
        processingDocs.forEach(doc => {
          pollDocumentStatus(doc.id)
        })
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [documents])

  const pollDocumentStatus = async (docId) => {
    if (pollingDocs.has(docId)) return
    setPollingDocs(prev => new Set(prev).add(docId))
    
    try {
      const response = await api.get(`/admin/documents/${docId}/status`)
      const status = response.data.status
      
      if (status !== 'processing') {
        setDocuments(prev => prev.map(d => 
          d.id === docId ? { ...d, status, chunk_count: response.data.chunk_count } : d
        ))
      }
    } finally {
      setPollingDocs(prev => {
        const newSet = new Set(prev)
        newSet.delete(docId)
        return newSet
      })
    }
  }

  const handleUpload = async (file) => {
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/admin/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const newDoc = {
        id: response.data.document_id,
        filename: response.data.filename,
        filetype: file.name.split('.').pop(),
        chunk_count: 0,
        status: 'processing',
        uploaded_at: new Date().toISOString(),
        uploaded_by_name: 'You'
      }
      setDocuments(prev => [newDoc, ...prev])
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (doc) => {
    setDocToDelete(doc)
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    if (!docToDelete) return
    try {
      await api.delete(`/admin/documents/${docToDelete.id}`)
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete document')
    }
    setShowConfirm(false)
    setDocToDelete(null)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      processing: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/20',
        icon: Clock
      },
      ready: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/20',
        icon: CheckCircle2
      },
      failed: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        icon: XCircle
      }
    }
    
    const config = statusConfig[status] || statusConfig.processing
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0)
  const readyDocs = documents.filter(d => d.status === 'ready').length
  const processingDocs = documents.filter(d => d.status === 'processing').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Document Library</h1>
        <p className="text-slate-400">Manage and monitor your knowledge base</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{documents.length}</p>
          <p className="text-slate-400 text-sm">Total Documents</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{readyDocs}</p>
          <p className="text-slate-400 text-sm">Ready Documents</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Database className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{totalChunks.toLocaleString()}</p>
          <p className="text-slate-400 text-sm">Total Chunks</p>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6"
        >
          {error}
        </motion.div>
      )}

      <div className="mb-6">
        <UploadZone onUpload={handleUpload} uploading={uploading} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Documents
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Document</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Chunks</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.map((doc) => (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-800/50 transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-xs">{doc.filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {doc.filetype}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{doc.chunk_count}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{doc.uploaded_by_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(doc.uploaded_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {documents.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No documents uploaded yet</p>
            <p className="text-slate-500 text-sm mt-1">Upload your first document to get started</p>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Delete Document"
          message={`Are you sure you want to delete ${docToDelete?.filename}?`}
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

export default Documents
