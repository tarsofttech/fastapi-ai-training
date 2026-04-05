import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SessionSidebar from './SessionSidebar'

function Layout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="h-screen flex bg-gray-950">
      <SessionSidebar />
      <main className="flex-1 bg-gray-950 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
