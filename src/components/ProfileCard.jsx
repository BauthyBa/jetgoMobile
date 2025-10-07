import GlassCard from './GlassCard'
import { useState, useMemo } from 'react'
import { updateUserMetadata } from '@/services/supabase'
import { upsertProfileToBackend } from '@/services/api'

export default function ProfileCard({ profile, readOnly = false }) {
  const name = profile?.meta?.first_name || profile?.email || ''
  const email = profile?.email || ''
  const location = profile?.meta?.country || ''
  const userId = typeof profile?.user_id === 'string' ? profile.user_id : ''
  const dni = profile?.meta?.document_number || profile?.meta?.dni || ''
  const dniVerified = profile?.dni_verified === true
  const lastName = profile?.meta?.last_name || profile?.meta?.surname || ''
  const birthDateRaw = profile?.meta?.birth_date || profile?.meta?.date_of_birth || profile?.meta?.dob || profile?.meta?.birthday || ''
  const birthDate = (() => {
    if (!birthDateRaw) return ''
    const d = new Date(birthDateRaw)
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  })()
  const age = (() => {
    if (!birthDate) return ''
    try {
      const [y, m, d] = birthDate.split('-').map((v) => parseInt(v))
      const today = new Date()
      let a = today.getFullYear() - y
      const mDiff = today.getMonth() + 1 - m
      const dDiff = today.getDate() - d
      if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) a -= 1
      return a >= 0 ? String(a) : ''
    } catch {
      return ''
    }
  })()
  const initialBio = (profile?.meta?.bio || '').toString()
  const initialInterests = Array.isArray(profile?.meta?.interests)
    ? profile.meta.interests.join(', ')
    : (profile?.meta?.interests || '').toString()
  const initialFavTrips = Array.isArray(profile?.meta?.favorite_travel_styles)
    ? profile.meta.favorite_travel_styles.join(', ')
    : (profile?.meta?.favorite_travel_styles || '').toString()

  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(initialBio)
  const [interestsText, setInterestsText] = useState(initialInterests)
  const [favTripsText, setFavTripsText] = useState(initialFavTrips)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedOnce, setSavedOnce] = useState(false)

  const interestsArray = useMemo(() => (
    interestsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  ), [interestsText])
  const favTripsArray = useMemo(() => (
    favTripsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  ), [favTripsText])

  // Parser robusto para listas que pueden venir como array, CSV o string JSON/PG array
  const parseListValue = (value) => {
    try {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
      const raw = (value || '').toString().trim()
      if (!raw) return []
      // Intentar JSON
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      } catch {}
      // Intentar formato Postgres {a,b} o [a b]
      const cleaned = raw.replace(/[\[\]{}\"]/g, ' ')
      return cleaned.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
    } catch {
      return []
    }
  }

  const initialInterestsTokens = useMemo(() => parseListValue(profile?.meta?.interests), [profile?.meta?.interests])
  const initialFavTripsTokens = useMemo(() => parseListValue(profile?.meta?.favorite_travel_styles), [profile?.meta?.favorite_travel_styles])
  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            {name ? (
              <span className="text-2xl sm:text-3xl text-blue-500 font-bold">{name?.charAt(0)?.toUpperCase()}</span>
            ) : null}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-between">
            <div className="min-w-0">
              {name && <h2 className="text-lg sm:text-xl font-bold truncate">{name}</h2>}
              {email && <p className="muted text-sm truncate">{email}</p>}
              {location && <p className="muted text-xs mt-1">{location}</p>}
            </div>
            <div className="flex-shrink-0">
              {!readOnly && editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => { setEditing(false); setBio(initialBio); setInterestsText(initialInterests); setFavTripsText(initialFavTrips); setError('') }}
                  >Cancelar</button>
                  <button
                    className="btn"
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        setSaving(true)
                        setError('')
                        // Guardar en metadata de Supabase (fuente de verdad)
                        await updateUserMetadata({
                          bio: (bio || '').slice(0, 500),
                          interests: interestsArray,
                          favorite_travel_styles: favTripsArray,
                        })
                        // Upsert espejo en tabla pública para perfiles visibles
                        try {
                          await upsertProfileToBackend({
                            user_id: profile?.user_id,
                            email: email,
                            first_name: name,
                            last_name: lastName,
                            document_number: dni,
                            sex: profile?.meta?.sex,
                            birth_date: profile?.meta?.birth_date,
                            bio: (bio || '').slice(0, 500),
                            interests: interestsArray,
                            favorite_travel_styles: favTripsArray,
                          })
                        } catch { /* noop */ }
                        setSavedOnce(true)
                        setEditing(false)
                      } catch (e) {
                        setError(e?.message || 'No se pudo guardar el perfil')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >{saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
              ) : (!readOnly && (
                <button className="btn secondary" type="button" onClick={() => setEditing(true)}>Editar</button>
              ))}
            </div>
          </div>

          {(userId || dni || lastName || birthDate || age) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/15">
              {dni && (
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="muted text-xs">DNI</div>
                  <div className="text-sm font-medium">{dni}</div>
                </div>
              )}
              {lastName && (
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="muted text-xs">Apellido</div>
                  <div className="text-sm font-medium">{lastName}</div>
                </div>
              )}
              {age && (
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="muted text-xs">Edad</div>
                  <div className="text-sm font-medium">{age} años</div>
                </div>
              )}
              {typeof dniVerified === 'boolean' && (
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="muted text-xs">DNI Verificado</div>
                  <div className={`text-sm font-medium ${dniVerified ? 'text-green-400' : 'text-red-400'}`}>
                    {dniVerified ? 'Sí' : 'No'}
                  </div>
                </div>
              )}
              {birthDate && (
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <div className="muted text-xs">Fecha de nacimiento</div>
                  <div className="text-sm font-medium">{birthDate}</div>
                </div>
              )}
              {userId && (
                <div className="bg-slate-800/30 rounded-lg p-3 sm:col-span-2 lg:col-span-1">
                  <div className="muted text-xs">User ID</div>
                  <div className="text-xs font-mono break-all">{userId}</div>
                </div>
              )}
            </div>
          )}

          {/* Bio e intereses */}
          <div className="mt-4 pt-4 border-t border-white/15 space-y-4">
            <div>
              <div className="muted text-xs mb-2">Biografía</div>
              {editing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Contanos sobre vos..."
                  rows={3}
                  className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm"
                  style={{ resize: 'vertical' }}
                  maxLength={500}
                />
              ) : (
                <div className="text-sm bg-slate-800/30 rounded-lg p-3 min-h-[60px]">
                  {(savedOnce ? bio : initialBio) || <span className="muted">Sin biografía</span>}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className="muted text-xs mb-2">Intereses</div>
                {editing ? (
                  <input
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    placeholder="Ej: senderismo, museos, gastronomía"
                    className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(savedOnce ? interestsArray : initialInterestsTokens).length === 0 && (
                      <span className="muted text-sm">Sin intereses</span>
                    )}
                    {(savedOnce ? interestsArray : initialInterestsTokens).map((t) => (
                      <span key={t} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <div className="muted text-xs mb-2">Tipos de viaje favoritos</div>
                {editing ? (
                  <input
                    value={favTripsText}
                    onChange={(e) => setFavTripsText(e.target.value)}
                    placeholder="Ej: mochilero, relax, aventura, cultura"
                    className="w-full bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(savedOnce ? favTripsArray : initialFavTripsTokens).length === 0 && (
                      <span className="muted text-sm">Sin preferencias</span>
                    )}
                    {(savedOnce ? favTripsArray : initialFavTripsTokens).map((t) => (
                      <span key={t} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-500/30">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}


