import Register from './Register.jsx'
import { useLocation } from 'react-router-dom'

export default function VerifyDni() {
  const location = useLocation()
  const search = location.search || ''
  return (
    <div className="container dashboard-sky">
      <div className="card glass-card" style={{ borderColor: 'rgba(155, 235, 255, 0.35)' }}>
        <h2 className="page-title" style={{ color: '#3b82f6' }}>Verificación de identidad (DNI)</h2>
        <p className="muted">Para completar tu registro, verificá tu identidad escaneando el DNI.</p>
        <Register />
      </div>
    </div>
  )
}


