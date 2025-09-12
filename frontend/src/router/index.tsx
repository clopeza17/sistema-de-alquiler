import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Propiedades from '../pages/Propiedades'
import Inquilinos from '../pages/Inquilinos'
import Usuarios from '../pages/Usuarios'
import RequireAuth from '../components/RequireAuth'
import RequireRole from '../components/RequireRole'
import Layout from '../components/Layout'

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Privadas con layout */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/propiedades" element={<Propiedades />} />
        <Route path="/inquilinos" element={<Inquilinos />} />
        <Route path="/usuarios" element={<RequireRole roles={["ADMIN"]}><Usuarios /></RequireRole>} />
      </Route>

      {/* Alias opcional */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
