import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { Layout } from './components/Layout'
import DeportesPage from './pages/DeportesPage'
import ConvocatoriasPage from './pages/ConvocatoriasPage'
import ConvocatoriaDetailPage from './pages/ConvocatoriaDetailPage'
import ConvocatoriaFormPage from './pages/ConvocatoriaFormPage'
import MisAsistenciasPage from './pages/MisAsistenciasPage'
import PerfilPage from './pages/PerfilPage'
import UsuariosPage from './pages/UsuariosPage'
import RolesPage from './pages/RolesPage'
import PermisosPage from './pages/PermisosPage'

function App() {
  return (
    <AuthProvider>
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
          <Route path="/deportes" element={<DeportesPage />} />
          <Route path="/convocatorias" element={<ConvocatoriasPage />} />
          <Route path="/convocatorias/new" element={<ConvocatoriaFormPage />} />
          <Route path="/convocatorias/:id" element={<ConvocatoriaDetailPage />} />
          <Route path="/convocatorias/:id/edit" element={<ConvocatoriaFormPage />} />
          <Route path="/mis-asistencias" element={<MisAsistenciasPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/permisos" element={<PermisosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App