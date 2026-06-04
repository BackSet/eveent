import { memo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermission?: string
  requiredAnyPermissions?: string[]
}

const ProtectedRoute = memo(function ProtectedRoute({
  children,
  requiredPermission,
  requiredAnyPermissions,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredAnyPermissions?.length && !requiredAnyPermissions.some(hasPermission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
})

export default ProtectedRoute
