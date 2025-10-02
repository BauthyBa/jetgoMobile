import { memo } from 'react'

function GlassCard({ children, className = '', hover = false }) {
  return (
    <div
      className={`glass-card ${hover ? 'hover-glow' : ''} ${className}`}
      style={{ transition: 'all 0.3s ease' }}
    >
      {children}
    </div>
  )
}

export default memo(GlassCard)


