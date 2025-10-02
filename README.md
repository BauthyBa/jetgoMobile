# JetGo Frontend (React + Vite + Tailwind)

Aplicación frontend de JetGo construida con React, Vite y TailwindCSS. Integra autenticación y chat en tiempo real con Supabase, consumo de API propia para viajes (trips) y routing con `react-router-dom`.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm 9+ o pnpm/yarn

## Empezar

```bash
# Instalar dependencias
npm install

# Correr en desarrollo
npm run dev

# Lint
npm run lint

# Build de producción
npm run build

# Previsualizar build
npm run preview
```

## Variables de entorno

Crea un archivo `.env` en la raíz con las siguientes claves (ejemplo):

```bash
VITE_API_BASE_URL=https://tu-backend.com/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Notas:
- Si no defines `VITE_API_BASE_URL`, el cliente de `axios` usará `http://localhost:8000/api`.
- Si no defines las claves de Supabase, el proyecto tiene valores de fallback solo para desarrollo local. Para producción SIEMPRE configura tus propias credenciales.

## Scripts disponibles

- `npm run dev`: Inicia Vite en modo desarrollo con HMR.
- `npm run build`: Genera el build optimizado.
- `npm run preview`: Sirve el build para previsualización local.
- `npm run lint`: Ejecuta ESLint sobre el proyecto.

## Tecnologías principales

- React 19, Vite 7
- TailwindCSS 3 + `tailwindcss-animate`
- React Router 7
- Supabase JS 2 (auth, RLS y realtime via canales)
- Axios
- ZXing (escaneo/QR si aplica)

## Estructura del proyecto

```
src/
  assets/                 # imágenes y recursos estáticos
  components/             # componentes UI y layouts
    ui/                   # inputs, buttons, etc.
  pages/                  # páginas del router
  services/               # integraciones: api, supabase, trips, chat
  lib/                    # utilidades varias
  App.jsx                 # landing/home
  main.jsx                # router y bootstrap de React
```

Rutas principales configuradas en `src/main.jsx`:
- `/` (landing `App.jsx` dentro de `Layout`)
- `/register`, `/login`, `/signup`, `/verify-dni` (flujo de auth/registro)
- `/dashboard` (área autenticada)

## Integración con API propia

En `src/services/api.js` se configura `axios` y el manejo de token JWT en `localStorage`, con helpers para:
- `registerUser(payload)`
- `login(email, password)` (guarda `access_token` y sincroniza sesión en Supabase si es posible)
- `upsertProfileToBackend(payload)`

Además, `src/services/trips.js` expone:
- `listTrips()` para listar viajes y normalizarlos a un modelo común
- `joinTrip(tripId, userId)` para unirse a un viaje

Configura `VITE_API_BASE_URL` para apuntar al backend correspondiente.

## Autenticación y Chat (Supabase)

`src/services/supabase.js` crea el cliente con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Expone utilidades como:
- `signInWithGoogle(redirectPath)`
- `getSession()`
- `updateUserMetadata(metadata)`

`src/services/chat.js` implementa un chat básico usando tablas `chat_rooms`, `chat_members`, `chat_messages` y suscripciones realtime:
- `getCurrentUser()`
- `listRoomsForUser(userId)`
- `createRoom(name)` (requiere sesión de Supabase)
- `fetchMessages(roomId)`
- `sendMessage(roomId, content)` (valida membresía)
- `subscribeToRoomMessages(roomId, onInsert)`

Asegúrate de tener las tablas, políticas RLS y canales configurados en tu proyecto de Supabase.

## Estilos y configuración

- Tailwind configurado en `tailwind.config.js` con tema extendido y modo `darkMode: 'class'`.
- Alias `@` → `./src` definido en `vite.config.js`.

## Despliegue

### Vercel

El archivo `vercel.json` configura:
- Cache estático de assets versionados.
- Fallback de rutas SPA a `index.html`.

Pasos sugeridos:
1. Configura variables de entorno del proyecto en Vercel (`VITE_*`).
2. Conecta el repo y despliega. Vercel detectará Vite automáticamente.

### Otras plataformas

- Construye con `npm run build`.
- Sirve `dist/` con cualquier servidor estático (asegura fallback de SPA a `index.html`).

## Buenas prácticas y desarrollo

- Mantén las claves `VITE_*` únicamente en entorno de ejecución del build y despliegue.
- No comitees credenciales reales.
- Usa `npm run lint` y formatea siguiendo el estilo existente.

## Troubleshooting

- 401/Token inválido: el interceptor de `axios` limpia el token y deberás reautenticar.
- Realtime/Chat no recibe mensajes: verifica RLS, permisos de tablas y que la sesión de Supabase esté activa.
- Rutas 404 en producción: asegúrate de configurar el fallback de SPA (en Vercel ya está en `vercel.json`).

## Licencia

Este proyecto se distribuye bajo la licencia que defina el repositorio principal. Si no está especificada, considera agregar una licencia (MIT recomendada).
