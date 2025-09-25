import './App.css'
import { Link } from 'react-router-dom'

function App() {
  return (
    <div className="home">
      <section className="glass" role="region" aria-label="Estado de la página">
        <h1>Página en construcción</h1>
        <p>Próximamente Jetgo</p>
        <div className="cta">
          <Link to="/signup" className="btn">Crear cuenta</Link>
          <Link to="/login" className="btn secondary">Ya tengo cuenta</Link>
        </div>
      </section>
    </div>
  )
}

export default App
