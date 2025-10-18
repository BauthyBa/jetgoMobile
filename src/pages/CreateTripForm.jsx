import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign,
  Car,
  Bus,
  Train,
  Plane,
  Home,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import CurrencySelect from '@/components/CurrencySelect'
import { getSession } from '@/services/supabase'
import { createTrip } from '@/services/trips'

export default function CreateTripForm() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Estados del formulario
  const [trip, setTrip] = useState({
    name: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD',
    roomType: '',
    season: '',
    country: '',
    maxParticipants: '',
    description: '',
    tipo: 'auto'
  })

  // Estados para autocompletado
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destinationSuggestions, setDestinationSuggestions] = useState([])
  const [countrySuggestions, setCountrySuggestions] = useState([])
  const [originQuery, setOriginQuery] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [isoCountry, setIsoCountry] = useState('')

  // Cargar perfil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await getSession()
        if (session?.user) {
          setProfile(session.user)
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  // Funciones de autocompletado (simplificadas para el ejemplo)
  const fetchCities = async (query, type) => {
    if (query.length < 3) return
    
    try {
      // Aquí iría la lógica real de autocompletado
      // Por ahora simulamos con datos estáticos
      const mockSuggestions = [
        { place_id: '1', display_name: `${query} - Ciudad` },
        { place_id: '2', display_name: `${query} - Aeropuerto` }
      ]
      
      if (type === 'origin') {
        setOriginSuggestions(mockSuggestions)
      } else if (type === 'destination') {
        setDestinationSuggestions(mockSuggestions)
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
    }
  }

  const fetchCountries = async (query) => {
    if (query.length < 2) return
    
    try {
      // Aquí iría la lógica real de autocompletado de países
      const mockSuggestions = [
        { place_id: '1', display_name: `${query} - País`, address: { country_code: 'AR' } }
      ]
      setCountrySuggestions(mockSuggestions)
    } catch (error) {
      console.error('Error fetching countries:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Validaciones básicas
      if (!trip.name || !trip.origin || !trip.destination || !trip.startDate) {
        throw new Error('Por favor completa todos los campos obligatorios')
      }

      if (new Date(trip.startDate) < new Date()) {
        throw new Error('La fecha de inicio debe ser futura')
      }

      if (trip.endDate && new Date(trip.endDate) < new Date(trip.startDate)) {
        throw new Error('La fecha de fin debe ser posterior a la de inicio')
      }

      // Preparar datos para envío
      const tripData = {
        ...trip,
        creatorId: profile.id,
        budgetMin: trip.budgetMin ? parseFloat(trip.budgetMin) : null,
        budgetMax: trip.budgetMax ? parseFloat(trip.budgetMax) : null,
        maxParticipants: trip.maxParticipants ? parseInt(trip.maxParticipants) : null,
        countryCode: isoCountry
      }

      // Crear el viaje
      const result = await createTrip(tripData)
      
      if (result) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/viajes')
        }, 2000)
      } else {
        throw new Error('Error al crear el viaje')
      }
    } catch (error) {
      console.error('Error creando viaje:', error)
      setError(error.message || 'Error al crear el viaje')
    } finally {
      setSubmitting(false)
    }
  }

  const transportTypes = [
    { value: 'auto', label: 'Auto', icon: Car },
    { value: 'bus', label: 'Bus', icon: Bus },
    { value: 'tren', label: 'Tren', icon: Train },
    { value: 'avion', label: 'Avión', icon: Plane }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 max-w-lg mx-4 text-center border border-slate-700/50">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">¡Viaje creado exitosamente!</h2>
          <p className="text-slate-300 mb-8 text-lg">
            Tu viaje ha sido publicado y ya está disponible para otros viajeros. ¡Prepárate para conocer gente increíble!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/viajes')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3"
            >
              Ver mis viajes
            </Button>
            <Button 
              onClick={() => navigate('/crear-viaje')}
              variant="secondary"
              className="px-6 py-3"
            >
              Crear otro viaje
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Crea tu <span className="text-emerald-400">viaje</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Completa los detalles de tu viaje y conecta con otros viajeros que compartan tu destino
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Form */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                  <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                    </div>
                    Información básica
                  </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">Nombre del viaje *</Label>
                  <Input
                    id="name"
                    value={trip.name}
                    onChange={(e) => setTrip({ ...trip, name: e.target.value })}
                    placeholder="Ej: Bariloche 2025"
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-slate-200">Tipo de transporte *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {transportTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <label
                          key={type.value}
                          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                            trip.tipo === type.value
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="tipo"
                            value={type.value}
                            checked={trip.tipo === type.value}
                            onChange={(e) => setTrip({ ...trip, tipo: e.target.value })}
                            className="sr-only"
                          />
                          <Icon className="w-4 h-4 text-slate-300" />
                          <span className="text-slate-200 text-sm">{type.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                Origen y destino
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <Label htmlFor="origin" className="text-slate-200">Origen *</Label>
                  <Input
                    id="origin"
                    value={trip.origin}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, origin: v })
                      setOriginQuery(v)
                      fetchCities(v, 'origin')
                    }}
                    placeholder="Ciudad de origen"
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                  {originSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-auto">
                      {originSuggestions.map((item, idx) => (
                        <li
                          key={`o_${idx}_${item.place_id}`}
                          className="p-3 cursor-pointer hover:bg-slate-600 text-slate-200"
                          onClick={() => {
                            setTrip({ ...trip, origin: item.display_name })
                            setOriginQuery(item.display_name)
                            setOriginSuggestions([])
                          }}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="destination" className="text-slate-200">Destino *</Label>
                  <Input
                    id="destination"
                    value={trip.destination}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, destination: v })
                      setDestinationQuery(v)
                      fetchCities(v, 'destination')
                    }}
                    placeholder="Ciudad de destino"
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                  {destinationSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-auto">
                      {destinationSuggestions.map((item, idx) => (
                        <li
                          key={`d_${idx}_${item.place_id}`}
                          className="p-3 cursor-pointer hover:bg-slate-600 text-slate-200"
                          onClick={() => {
                            setTrip({ ...trip, destination: item.display_name })
                            setDestinationQuery(item.display_name)
                            setDestinationSuggestions([])
                          }}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
                </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                Fechas
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-slate-200">Fecha de inicio *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={trip.startDate}
                    onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-slate-200">Fecha de fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={trip.endDate}
                    onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
                    min={trip.startDate || new Date().toISOString().split('T')[0]}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                Participantes y presupuesto
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants" className="text-slate-200">Máximo de participantes</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={trip.maxParticipants}
                    onChange={(e) => setTrip({ ...trip, maxParticipants: e.target.value })}
                    placeholder="2"
                    min="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-slate-200">Divisa</Label>
                  <CurrencySelect
                    value={trip.currency}
                    onChange={(e) => setTrip({ ...trip, currency: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetMin" className="text-slate-200">Presupuesto mínimo</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    value={trip.budgetMin}
                    onChange={(e) => setTrip({ ...trip, budgetMin: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetMax" className="text-slate-200">Presupuesto máximo</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    value={trip.budgetMax}
                    onChange={(e) => setTrip({ ...trip, budgetMax: e.target.value })}
                    placeholder="9999"
                    min="0"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-orange-400" />
                </div>
                Detalles adicionales
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="roomType" className="text-slate-200">Tipo de habitación</Label>
                  <select
                    id="roomType"
                    value={trip.roomType}
                    onChange={(e) => setTrip({ ...trip, roomType: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    <option value="">Seleccionar</option>
                    <option value="shared">Compartida</option>
                    <option value="private">Privada</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="season" className="text-slate-200">Temporada</Label>
                  <select
                    id="season"
                    value={trip.season}
                    onChange={(e) => setTrip({ ...trip, season: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    <option value="">Seleccionar</option>
                    <option value="spring">Primavera</option>
                    <option value="summer">Verano</option>
                    <option value="autumn">Otoño</option>
                    <option value="winter">Invierno</option>
                    <option value="any">Cualquiera</option>
                  </select>
                </div>

                <div className="space-y-2 relative md:col-span-2">
                  <Label htmlFor="country" className="text-slate-200">País</Label>
                  <Input
                    id="country"
                    value={trip.country}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, country: v })
                      setCountryQuery(v)
                      setIsoCountry('')
                      fetchCountries(v)
                    }}
                    placeholder="Argentina"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  {countrySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-auto">
                      {countrySuggestions.map((item, idx) => (
                        <li
                          key={`c_${idx}_${item.place_id}`}
                          className="p-3 cursor-pointer hover:bg-slate-600 text-slate-200"
                          onClick={() => {
                            const label = item.display_name
                            const code = (item.address && item.address.country_code ? String(item.address.country_code).toUpperCase() : '')
                            setTrip({ ...trip, country: label })
                            setIsoCountry(code)
                            setCountrySuggestions([])
                          }}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isoCountry && (
                    <p className="text-xs text-slate-400 mt-1">Código país: {isoCountry}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-slate-200">Descripción del viaje</Label>
                  <Textarea
                    id="description"
                    value={trip.description}
                    onChange={(e) => setTrip({ ...trip, description: e.target.value })}
                    placeholder="Describe tu viaje, qué planes tienes, qué tipo de compañía buscas..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <span className="text-red-300 font-medium">{error}</span>
              </div>
            )}

            {/* Submit button */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/crear-viaje')}
                className="px-8 py-3 text-lg"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creando viaje...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Crear mi viaje
                  </>
                )}
              </Button>
            </div>
              </form>
            </div>

            {/* Right Column - Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 h-full min-h-[600px] flex items-center justify-center relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-4 left-4 w-16 h-16 bg-blue-200/30 rounded-full blur-sm"></div>
                <div className="absolute top-8 right-8 w-12 h-12 bg-indigo-200/30 rounded-full blur-sm"></div>
                <div className="absolute bottom-8 left-8 w-20 h-20 bg-cyan-200/30 rounded-full blur-sm"></div>
                <div className="absolute bottom-4 right-4 w-14 h-14 bg-blue-300/30 rounded-full blur-sm"></div>
                
                {/* Main illustration content */}
                <div className="text-center z-10">
                  <div className="mb-8">
                    <Globe className="w-24 h-24 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Conecta el mundo</h3>
                    <p className="text-gray-600">Viaja con JetGo y descubre nuevas aventuras</p>
                  </div>
                  
                  {/* Transport icons */}
                  <div className="flex justify-center space-x-6 mb-6">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Car className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Bus className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Train className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Plane className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>🌍 Destinos únicos</p>
                    <p>👥 Comunidad de viajeros</p>
                    <p>💰 Ahorra en cada viaje</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
