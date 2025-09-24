import './App.css'
import { Link } from 'react-router-dom'

function App() {
  return (
    <main className="home">
      <section className="glass" role="region" aria-label="Estado de la página">
        <h1>Página en construcción</h1>
        <p>Próximamente Jetgo</p>
        <div className="cta">
          <Link to="/register" className="btn">Ir a Registro</Link>
        </div>
      </section>
    </main>
  )
}

export default App
