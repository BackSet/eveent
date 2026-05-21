import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Spinner } from '@/components/ui/spinner'

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
const RolesPage = lazy(() => import('./pages/RolesPage'))
const PermisosPage = lazy(() => import('./pages/PermisosPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Spinner className="h-10 w-10 text-primary" />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
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
            <Route path="/convocatorias/new" element={<ConvocatoriaFormPage />} />
            <Route path="/convocatorias/recurrentes/new" element={<ConvocatoriaFormPage />} />
            <Route path="/convocatorias/:id" element={<ConvocatoriaDetailPage />} />
            <Route path="/convocatorias/:id/edit" element={<ConvocatoriaFormPage />} />
            <Route path="/convocatorias/recurrentes/:id/edit" element={<ConvocatoriaFormPage />} />
            <Route path="/mis-asistencias" element={<MisAsistenciasPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/usuarios" element={
              <ProtectedRoute requiredPermission="gestionar_usuarios"><UsuariosPage /></ProtectedRoute>
            } />
            <Route path="/grupos" element={
              <ProtectedRoute requiredPermission="gestionar_usuarios"><GruposPage /></ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute requiredPermission="gestionar_roles"><RolesPage /></ProtectedRoute>
            } />
            <Route path="/permisos" element={
              <ProtectedRoute requiredPermission="ver_permisos"><PermisosPage /></ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App