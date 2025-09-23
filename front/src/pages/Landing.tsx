import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 className="page-title">JetGo</h1>
        <p className="muted">Bienvenido. Elegí una opción para continuar.</p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/register">Registro</Link>
          <Link className="btn secondary" to="/login">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  )
}


