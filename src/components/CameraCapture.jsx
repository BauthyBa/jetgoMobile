import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, X, RotateCcw } from 'lucide-react'

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      stopCamera()

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsStreaming(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }, [facingMode, stopCamera])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob)
          stopCamera()
        }
      },
      'image/jpeg',
      0.9,
    )
  }

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const handleCancel = () => {
    stopCamera()
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/40">
          <video ref={videoRef} className="w-full h-auto" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex justify-between items-center">
              <button
                onClick={handleCancel}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={switchCamera}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                title="Cambiar cámara"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center pb-2">
              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-4 text-center text-slate-100 text-sm">
          Toca el botón blanco para tomar una foto
        </div>
      </div>
    </div>
  )
}
