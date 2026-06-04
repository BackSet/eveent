import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { isAnalyticsEnabled, trackPageView } from './lib/analytics'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SimplePageSkeleton } from '@/components/ui/page-skeletons'
import { ToastProvider } from '@/components/ui/toast'
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog'
import { setOnUnauthorized } from './services/api'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DeportesPage = lazy(() => import('./pages/DeportesPage'))
const ConvocatoriasPage = lazy(() => import('./pages/ConvocatoriasPage'))
const ConvocatoriaDetailPage = lazy(() => import('./pages/ConvocatoriaDetailPage'))
const ConvocatoriaFormPage = lazy(() => import('./pages/ConvocatoriaFormPage'))
const MisAsistenciasPage = lazy(() => import('./pages/MisAsistenciasPage'))
const PerfilPage = lazy(() => import('./pages/PerfilPage'))
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'))
const GruposPage = lazy(() => import('./pages/GruposPage'))
const MisGruposPage = lazy(() => import('./pages/MisGruposPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const PermisosPage = lazy(() => import('./pages/PermisosPage'))

function PageLoader() {
  return (
    <div className="page-shell">
      <SimplePageSkeleton />
    </div>
  )
}

function AnalyticsListener() {
  const location = useLocation()

  useEffect(() => {
    if (!isAnalyticsEnabled()) return
    trackPageView(location.pathname + location.search, document.title)
  }, [location.pathname, location.search])

  return null
}

function AppWithApiSetup() {
  const navigate = useNavigate()

  useEffect(() => {
    setOnUnauthorized(() => navigate('/login', { replace: true }))
  }, [navigate])

  return (
    <ErrorBoundary>
      <AnalyticsListener />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deportes" element={
              <ProtectedRoute requiredPermission="gestionar_deportes"><DeportesPage /></ProtectedRoute>
            } />
            <Route path="/convocatorias" element={<ConvocatoriasPage />} />
            <Route path="/convocatorias/new" element={
              <ProtectedRoute requiredPermission="crear_convocatorias"><ConvocatoriaFormPage /></ProtectedRoute>
            } />
            <Route path="/convocatorias/recurrentes/new" element={
              <ProtectedRoute requiredPermission="crear_convocatorias"><ConvocatoriaFormPage recurrente /></ProtectedRoute>
            } />
            <Route path="/convocatorias/:id" element={<ConvocatoriaDetailPage />} />
            <Route path="/convocatorias/:id/edit" element={
              <ProtectedRoute requiredPermission="editar_convocatorias"><ConvocatoriaFormPage /></ProtectedRoute>
            } />
            <Route path="/convocatorias/recurrentes/:id/edit" element={
              <ProtectedRoute requiredPermission="crear_convocatorias"><ConvocatoriaFormPage recurrente /></ProtectedRoute>
            } />
            <Route path="/mis-asistencias" element={<MisAsistenciasPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/usuarios" element={
              <ProtectedRoute requiredPermission="ver_usuarios"><UsuariosPage /></ProtectedRoute>
            } />
            <Route path="/grupos" element={
              <ProtectedRoute requiredPermission="crear_grupos"><GruposPage /></ProtectedRoute>
            } />
            <Route path="/mis-grupos" element={
              <ProtectedRoute requiredPermission="ver_grupos"><MisGruposPage /></ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute requiredPermission="ver_roles"><RolesPage /></ProtectedRoute>
            } />
            <Route path="/permisos" element={
              <ProtectedRoute requiredAnyPermissions={["ver_permisos", "gestionar_roles"]}><PermisosPage /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <AppWithApiSetup />
        </ConfirmDialogProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
