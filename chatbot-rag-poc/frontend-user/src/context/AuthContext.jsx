import React, { createContext, useContext, useState, useEffect } from 'react'
import api, { setAccessToken, getAccessToken } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setToken] = useState(getAccessToken())

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken()
      if (token) {
        try {
          const response = await api.get('/auth/me')
          setUser(response.data)
        } catch (error) {
          try {
            const refreshResponse = await api.post('/auth/refresh')
            setAccessToken(refreshResponse.data.access_token)
            setToken(refreshResponse.data.access_token)
            const meResponse = await api.get('/auth/me')
            setUser(meResponse.data)
          } catch {
            setAccessToken(null)
            setToken(null)
          }
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { access_token, user: userData } = response.data
    setAccessToken(access_token)
    setToken(access_token)
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setAccessToken(null)
      setToken(null)
      setUser(null)
      window.location.href = '/login'
    }
  }

  const value = {
    user,
    accessToken,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
