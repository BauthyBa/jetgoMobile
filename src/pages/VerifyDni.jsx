import Register from './Register.jsx'
import { useLocation } from 'react-router-dom'

export default function VerifyDni() {
  const location = useLocation()
  const search = location.search || ''
  return (
    <div className="container">
      <div className="card">
        <h2 className="page-title">Verificación de identidad (DNI)</h2>
        <p className="muted">Para completar tu registro, verificá tu identidad escaneando el DNI.</p>
        <Register />
      </div>
    </div>
  )
}


