import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function BackButton({
  fallback = '/',
  variant = 'ghost',
  className,
  children,
  onClick,
  ...props
}) {
  const navigate = useNavigate()

  const handleClick = useCallback(
    (event) => {
      onClick?.(event)
      if (event?.defaultPrevented) return

      if (window.history.length > 1) {
        navigate(-1)
        return
      }
      if (fallback) navigate(fallback)
    },
    [navigate, fallback, onClick]
  )

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleClick}
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{children || 'Volver'}</span>
    </Button>
  )
}
