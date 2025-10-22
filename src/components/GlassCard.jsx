import { memo } from 'react'

function GlassCard({ children, className = '', hover = false, style, ...rest }) {
  return (
    <div
      className={`glass-card ${hover ? 'hover-glow' : ''} ${className}`}
      style={{ transition: 'all 0.3s ease', ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}

export default memo(GlassCard)


