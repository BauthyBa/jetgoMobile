import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../api'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    document_number: '',
    sex: 'M' as 'M' | 'F',
    birth_date: '',
    email: '',
    password: '',
    dni_front_payload: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [scanning, setScanning] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const backImgRef = useRef<HTMLImageElement | null>(null)
  const [scanned, setScanned] = useState<null | { lastnames: string; names: string; sex: 'M' | 'F'; document: string; birthISO: string }>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [decodedText, setDecodedText] = useState<string>('')
  const [overlay, setOverlay] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const parseDniPayload = (payload: string) => {
    // Normalizar: quitar caracteres no imprimibles excepto @ y /
    let text = payload.replace(/[^\x20-\x7E@/]/g, '')
    // Reemplazar saltos de línea por @ y colapsar múltiples @
    text = text.replace(/\r?\n/g, '@').replace(/@{2,}/g, '@').trim()
    const parts = text.split('@')
    if (parts.length < 9) return null
    const lastnames = parts[1].replaceAll("'", '').trim()
    const names = parts[2].replaceAll("'", '').trim()
    const sex = parts[3].replaceAll("'", '').trim() as 'M' | 'F'
    const document = parts[4].replaceAll("'", '').trim()
    const birth = parts[6].replaceAll("'", '').trim() // DD/MM/YYYY
    const [d, m, y] = birth.split('/')
    const birthISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return { lastnames, names, sex, document, birthISO }
  }

  const rotateDataUrl = (url: string, angle: number) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no soportado'))
        const radians = (angle * Math.PI) / 180
        const sin = Math.abs(Math.sin(radians))
        const cos = Math.abs(Math.cos(radians))
        const newWidth = img.width * cos + img.height * sin
        const newHeight = img.width * sin + img.height * cos
        canvas.width = Math.ceil(newWidth)
        canvas.height = Math.ceil(newHeight)
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(radians)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  const tryDecodeWithFallbacks = async (url: string) => {
    // Hints: forzar PDF_417 y modo intensivo
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417])
    const reader = new BrowserMultiFormatReader(hints)
    // 1) directo
    try {
      return await reader.decodeFromImageUrl(url)
    } catch {}
    // 2) rotaciones
    const angles = [90, 180, 270]
    for (const angle of angles) {
      try {
        const rotated = await rotateDataUrl(url, angle)
        return await reader.decodeFromImageUrl(rotated)
      } catch {}
    }
    throw new Error('No se pudo decodificar el PDF417')
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (imgRef.current) imgRef.current.src = url
    setScanning(true)
    setError(null)
    setOverlay({ visible: true, message: 'Analizando DNI…' })
    try {
      const result = await tryDecodeWithFallbacks(url)
      const text = result.getText()
      setDecodedText(text)
      // Guardar la cadena decodificada aunque el parser falle
      setForm((f) => ({ ...f, dni_front_payload: text }))
      const parsed = parseDniPayload(text)
      if (parsed) {
        setScanned(parsed)
        setScanStatus('ok')
        setForm((f) => ({
          ...f,
          first_name: parsed.names,
          last_name: parsed.lastnames,
          sex: parsed.sex,
          document_number: parsed.document,
          birth_date: parsed.birthISO,
        }))
        setOverlay({ visible: false, message: '' })
      } else {
        setScanned(null)
        setScanStatus('error')
        throw new Error('No se pudo validar el código. Intentá otra foto más nítida del frente del DNI.')
      }
    } catch (err: any) {
      setError('No se pudo leer el código de barras. Asegúrate de subir el frente del DNI con buena calidad.')
      setScanStatus('error')
      setOverlay({ visible: false, message: '' })
    } finally {
      setScanning(false)
    }
  }

  const handleBackImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (backImgRef.current) backImgRef.current.src = url
    // No hacemos nada más: solo guardamos la previsualización del dorso
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOk(false)
    try {
      if (!scanned) throw new Error('No se pudo leer/validar el código del DNI. Reintenta con una foto más nítida y bien orientada.')
      setOverlay({ visible: true, message: 'Comprobando tus datos…' })
      // Comparación cliente: permitir uno o dos nombres/apellidos (subset de tokens)
      const stripAccents = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const norm = (s: string) => stripAccents(s).trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean)
      const isSubset = (a: string[], b: string[]) => a.every((x) => b.includes(x))
      const mismatches: string[] = []
      const inNames = norm(form.first_name)
      const dnNames = norm(scanned.names)
      if (!(isSubset(inNames, dnNames) || isSubset(dnNames, inNames))) mismatches.push('Nombres')
      const inLast = norm(form.last_name)
      const dnLast = norm(scanned.lastnames)
      if (!(isSubset(inLast, dnLast) || isSubset(dnLast, inLast))) mismatches.push('Apellidos')
      if (form.sex.toUpperCase().slice(0,1) !== scanned.sex.toUpperCase().slice(0,1)) mismatches.push('Sexo')
      const onlyDigits = (x: string) => x.replace(/\D/g, '')
      if (onlyDigits(form.document_number) !== onlyDigits(scanned.document)) mismatches.push('Número de documento')
      if (form.birth_date !== scanned.birthISO) mismatches.push('Fecha de nacimiento')
      if (mismatches.length) {
        throw new Error(`Los siguientes campos no coinciden con el DNI: ${mismatches.join(', ')}`)
      }
      await registerUser(form)
      setOk(true)
    } catch (err: any) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : err.message)
    } finally {
      setLoading(false)
      setOverlay({ visible: false, message: '' })
    }
  }

  return (
    <>
    <div className="container">
      <div className="card">
        <h2 className="page-title">Registro</h2>
        <p className="muted">Subí la foto del frente del DNI. Vamos a leer el código de barras y completar tus datos automáticamente.</p>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Foto del DNI (frente)</label>
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          <div className={"preview " + (imgRef.current?.src ? 'visible' : '')}>
            <img ref={imgRef} alt="preview" />
          </div>
          <div className="field">
            <label>Foto del DNI (dorso)</label>
            <input type="file" accept="image/*" onChange={handleBackImageChange} />
          </div>
          <div className={"preview " + (backImgRef.current?.src ? 'visible' : '')}>
            <img ref={backImgRef} alt="preview dorso" />
          </div>
          <div className="field">
            <label>Nombres</label>
            <input name="first_name" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Apellidos</label>
            <input name="last_name" value={form.last_name} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Número de Documento</label>
            <input name="document_number" value={form.document_number} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Sexo</label>
            <select name="sex" value={form.sex} onChange={handleChange}>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="field">
            <label>Fecha de nacimiento</label>
            <input type="date" name="birth_date" value={form.birth_date} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Correo</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>
          {/* Campo oculto para enviar la cadena escaneada al backend */}
          <input type="hidden" name="dni_front_payload" value={form.dni_front_payload} />
          <div className="actions">
            <button className="btn" type="submit" disabled={loading || scanning}>{loading ? 'Enviando...' : (scanning ? 'Leyendo...' : 'Crear cuenta')}</button>
            <button className="btn secondary" type="button" onClick={() => { setForm({ ...form, first_name: '', last_name: '', document_number: '', sex: 'M', birth_date: '', dni_front_payload: '' }); setScanned(null); if (imgRef.current) imgRef.current.src = ''; }}>Limpiar</button>
            <button className="btn secondary" type="button" onClick={() => navigate(-1)}>Atrás</button>
            <span className="muted">{scanning ? 'Procesando imagen...' : ''}</span>
          </div>
          {ok && <p className="success">Revisa tu correo para confirmar la cuenta. Luego podés iniciar sesión.</p>}
          {error && <pre className="error">{error}</pre>}
        </form>
      </div>
    </div>
    {overlay.visible && (
      <div className="overlay">
        <div className="overlay-box">
          <div className="loader"></div>
          <div>{overlay.message}</div>
        </div>
      </div>
    )}
  </>
  )
}


