# Deploy Front (Vercel) y Back (Render)

## Vercel (front)

1. Variables de entorno:
   - `VITE_API_BASE_URL=https://tu-back.onrender.com/api`
2. Conecta el repo y despliega.
3. SPA rewrite ya configurado en `vercel.json`.

## Render (back)

1. Conecta el repo.
2. Usa `render.yaml` en la raíz (`jetgoBack/render.yaml`).
3. Variables recomendadas:
   - `SECRET_KEY` (obligatoria en prod)
   - `ALLOWED_HOSTS` (coma separada)
   - `CORS_ALLOWED_ORIGINS` (Vercel + localhost)
   - `CSRF_TRUSTED_ORIGINS` (dominio Vercel)
