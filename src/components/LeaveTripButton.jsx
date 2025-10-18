import { useState } from 'react'
import { leaveTrip } from '../services/applications'

export default function LeaveTripButton({ tripId, onLeft }) {
  const [loading, setLoading] = useState(false)

  const handleLeave = async () => {
    if (!confirm('¿Seguro que querés abandonar este viaje?')) return
    setLoading(true)
    try {
      await leaveTrip(tripId)
      onLeft?.()
    } catch (error) {
      alert(error?.response?.data?.error || 'No se pudo abandonar el viaje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLeave}
      disabled={loading}
      className="btn bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
    >
      {loading ? 'Saliendo...' : 'Abandonar viaje'}
    </button>
  )
}


