import Register from './Register.jsx'
import { useLocation } from 'react-router-dom'

export default function VerifyDni() {
  const location = useLocation()
  const search = location.search || ''
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700/50">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Verificación de identidad</h2>
          <p className="text-slate-400 text-sm">Para completar tu registro, verificá tu identidad escaneando el DNI.</p>
        </div>
        <div className="embedded-register">
          <Register embedded />
        </div>
      </div>
    </div>
  )
}


