import './App.css'
import { Link } from 'react-router-dom'

function App() {
  return (
    <div className="home">
      <section className="glass" role="region" aria-label="Inicio JetGo">
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw + 1rem, 4rem)' }}>JetGo</h1>
        <p style={{ fontSize: 'clamp(1.1rem, 1.4vw + 0.9rem, 1.35rem)' }}>Viajá fácil, barato y acompañado</p>
        <div className="cta" style={{ marginTop: '1.25rem' }}>
          <Link to="/login" className="btn">Iniciar sesión</Link>
          <Link to="/signup" className="btn secondary">Registrarse</Link>
        </div>
        <div id="viajes" style={{ marginTop: '2rem', textAlign: 'left' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Viajes</h2>
          <p>Explorá rutas compartidas y armá tu próximo viaje con personas afines. Filtrá por destino, fechas y presupuesto.</p>
        </div>

        <div className="row" id="herramientas" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Herramientas</h2>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
              <li>Verificación de identidad</li>
              <li>Búsqueda de paquetes</li>
              <li>Calculadora para dividir gastos</li>
              <li>Chat en tiempo real</li>
            </ul>
          </div>
          <div id="sobre-nosotros">
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Sobre nosotros</h2>
            <p>Somos un equipo apasionado por conectar viajeros para que puedan compartir gastos y vivir experiencias auténticas en todo el mundo, de forma segura.</p>
          </div>
        </div>

        <div id="soporte" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Soporte</h2>
          <p>Encontrá ayuda, guías y preguntas frecuentes en nuestro centro de soporte dentro de la app.</p>
        </div>
      </section>
    </div>
  )
}

export default App
