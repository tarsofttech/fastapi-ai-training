import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Lock, Shield, Check, Loader2 } from 'lucide-react'
import api from '../api/axios'

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.2 }
  }
}

function UserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState(null)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (user) {
        const updateData = { ...formData }
        if (!updateData.password) delete updateData.password
        await api.patch(`/admin/users/${user.id}`, updateData)
      } else {
        if (!formData.password) {
          setError('Password is required for new users')
          setLoading(false)
          return
        }
        await api.post('/admin/users', formData)
      }
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const InputField = ({ icon: Icon, label, name, type = 'text', required = false, placeholder, ...props }) => (
    <div className="mb-4">
      <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <motion.div
        animate={{ 
          scale: focusedField === name ? 1.01 : 1,
          boxShadow: focusedField === name ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none'
        }}
        className="rounded-lg"
      >
        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField(null)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          required={required}
          {...props}
        />
      </motion.div>
    </div>
  )

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {user ? 'Edit User' : 'New User'}
              </h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          <div className="p-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2"
                >
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              <InputField
                icon={User}
                label="Name"
                name="name"
                required
                placeholder="Enter full name"
              />

              <InputField
                icon={Mail}
                label="Email"
                name="email"
                type="email"
                required
                placeholder="Enter email address"
              />

              <InputField
                icon={Lock}
                label={`Password ${user ? '(leave blank to keep unchanged)' : ''}`}
                name="password"
                type="password"
                required={!user}
                placeholder={user ? '••••••••' : 'Enter password'}
              />

              <div className="mb-4">
                <label className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['user', 'admin'].map((role) => (
                    <motion.button
                      key={role}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData(prev => ({ ...prev, role }))}
                      className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium capitalize ${
                        formData.role === role
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {role}
                    </motion.button>
                  ))}
                </div>
              </div>

              {user && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6"
                >
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <motion.div
                      animate={{ 
                        backgroundColor: formData.is_active ? '#3B82F6' : '#E5E7EB',
                        borderColor: formData.is_active ? '#3B82F6' : '#D1D5DB'
                      }}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                    >
                      {formData.is_active && <Check className="w-3 h-3 text-white" />}
                    </motion.div>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <span className="text-gray-700 font-medium">Active Account</span>
                  </label>
                </motion.div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default UserModal
