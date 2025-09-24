import { useRef, useState } from 'react'
import { registerUser } from '../services/api'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    document_number: '',
    sex: 'M',
    birth_date: '',
    email: '',
    password: '',
    dni_front_payload: '',
    dni_image_file: null,
    dni_image_url: '',
    dni_back_file: null,
    dni_back_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)
  const [scanning, setScanning] = useState(false)
  const imgRef = useRef(null)
  const backImgRef = useRef(null)
  const [scanStatus, setScanStatus] = useState('idle')
  const [overlay, setOverlay] = useState({ visible: false, message: '' })

  const parseDniPayload = (payload) => {
    let text = payload.replace(/[^\x20-\x7E@/]/g, '')
    text = text.replace(/\r?\n/g, '@').replace(/@{2,}/g, '@').trim()
    const parts = text.split('@')
    if (parts.length < 9) return null
    const lastnames = parts[1].replaceAll("'", '').trim()
    const names = parts[2].replaceAll("'", '').trim()
    const sex = parts[3].replaceAll("'", '').trim()
    const document = parts[4].replaceAll("'", '').trim()
    const birth = parts[6].replaceAll("'", '').trim()
    const [d, m, y] = birth.split('/')
    const birthISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return { lastnames, names, sex, document, birthISO }
  }

  const rotateDataUrl = (url, angle) => {
    return new Promise((resolve, reject) => {
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

  const preprocessImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no soportado'))
        const maxWidth = 2000
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
          const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30)
          data[i] = enhanced
          data[i + 1] = enhanced
          data[i + 2] = enhanced
        }
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  const tryDecodeWithFallbacks = async (url) => {
    const processedUrl = await preprocessImage(url)
    const hintConfigs = [
      { name: 'PDF_417_only', hints: new Map([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]], [DecodeHintType.CHARACTER_SET, 'UTF-8']]) },
      { name: 'Multiple_formats', hints: new Map([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.DATA_MATRIX]], [DecodeHintType.CHARACTER_SET, 'UTF-8']]) },
      { name: 'All_formats', hints: new Map([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.CHARACTER_SET, 'UTF-8']]) },
    ]

    const images = [ { name: 'processed', url: processedUrl }, { name: 'original', url } ]
    const angles = [0, 90, 180, 270]

    for (const config of hintConfigs) {
      for (const image of images) {
        for (const angle of angles) {
          try {
            const reader = new BrowserMultiFormatReader(config.hints)
            let imageUrl = image.url
            if (angle !== 0) {
              imageUrl = await rotateDataUrl(image.url, angle)
            }
            const result = await reader.decodeFromImageUrl(imageUrl)
            return result
          } catch (e) {
            // continue
          }
        }
      }
    }
    throw new Error('No se pudo decodificar el código de barras con ningún método.')
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (imgRef.current) imgRef.current.src = url
    setForm((f) => ({ ...f, dni_image_file: file, dni_image_url: url }))
    setError(null)
    setScanStatus('idle')
  }

  const handleBackImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (backImgRef.current) backImgRef.current.src = url
    setForm((f) => ({ ...f, dni_back_file: file, dni_back_url: url }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOk(false)
    setScanning(true)
    setOverlay({ visible: true, message: 'Analizando DNI…' })
    try {
      if (!form.dni_image_file) throw new Error('Debes subir una foto del frente del DNI')
      if (!form.dni_back_file) throw new Error('Debes subir una foto del dorso del DNI')
      const result = await tryDecodeWithFallbacks(form.dni_image_url)
      const text = result.getText()
      setForm((f) => ({ ...f, dni_front_payload: text }))
      const parsed = parseDniPayload(text)
      if (!parsed) throw new Error('No se pudo validar el código. Intentá otra foto más nítida del frente del DNI.')

      const stripAccents = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const norm = (s) => stripAccents(s).trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean)
      const isSubset = (a, b) => a.every((x) => b.includes(x))
      const mismatches = []
      const inNames = norm(form.first_name)
      const dnNames = norm(parsed.names)
      if (!(isSubset(inNames, dnNames) || isSubset(dnNames, inNames))) mismatches.push('Nombres')
      const inLast = norm(form.last_name)
      const dnLast = norm(parsed.lastnames)
      if (!(isSubset(inLast, dnLast) || isSubset(dnLast, inLast))) mismatches.push('Apellidos')
      const onlyDigits = (x) => x.replace(/\D/g, '')
      if (onlyDigits(form.document_number) !== onlyDigits(parsed.document)) mismatches.push('Número de documento')
      if (form.sex.toUpperCase().slice(0,1) !== parsed.sex.toUpperCase().slice(0,1)) mismatches.push('Sexo')
      if (form.birth_date !== parsed.birthISO) mismatches.push('Fecha de nacimiento')
      if (mismatches.length) throw new Error(`Los siguientes campos no coinciden con el DNI: ${mismatches.join(', ')}`)

      await registerUser(form)
      setOk(true)
    } catch (err) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : err.message)
      setScanStatus('error')
    } finally {
      setLoading(false)
      setScanning(false)
      setOverlay({ visible: false, message: '' })
    }
  }

  return (
    <>
      <div className="container">
        <div className="card">
          <h2 className="page-title">Registro</h2>
          <p className="muted">Subí la foto del frente del DNI para verificar tus datos. Ingresá tus datos manualmente en los campos de abajo.</p>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Foto del DNI (frente)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>
            <div className={"preview " + (imgRef.current?.src ? 'visible' : '')}>
              <img ref={imgRef} alt="preview" style={{ maxHeight: 220 }} />
            </div>
            <div className="field">
              <label>Foto del DNI (dorso)</label>
              <input type="file" accept="image/*" onChange={handleBackImageChange} />
            </div>
            <div className={"preview " + (backImgRef.current?.src ? 'visible' : '')}>
              <img ref={backImgRef} alt="preview dorso" style={{ maxHeight: 220 }} />
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
            <input type="hidden" name="dni_front_payload" value={form.dni_front_payload} />
            <div className="actions">
              <button className="btn" type="submit" disabled={loading || scanning}>{loading ? 'Enviando...' : (scanning ? 'Leyendo...' : 'Crear cuenta')}</button>
              <button className="btn secondary" type="button" onClick={() => { setForm({ ...form, first_name: '', last_name: '', document_number: '', sex: 'M', birth_date: '', dni_front_payload: '', dni_image_file: null, dni_image_url: '', dni_back_file: null, dni_back_url: '' }); if (imgRef.current) imgRef.current.src = ''; if (backImgRef.current) backImgRef.current.src = ''; }}>Limpiar</button>
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


