import { Link } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 className="page-title">JetGo Prueba</h1>
        <p className="muted">Demo de Registro con verificación de DNI y Login con JWT</p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/register">Registro</Link>
          <Link className="btn secondary" to="/login">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  )
}

export default App
