import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute() {
  const { user, status, restoreSession, token } = useAuthStore()

  useEffect(() => {
    if (token && !user && status === 'idle') {
      restoreSession()
    }
  }, [token, user, status, restoreSession])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (status === 'loading' || (!user && token)) {
    return (
      <div className="flex h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <Outlet />
}
