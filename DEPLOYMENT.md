# PixelBuy Deployment

This repo is prepared for:

- Vercel: `web/` Vite React app
- Render: PHP API service from `backend/Dockerfile`
- Render: Python Gemini Live websocket service from `backend/scripts/gemini_live_server.py`
- MySQL: external MySQL database reachable from Render

## 1. Database

Create a MySQL database that Render can reach, then import:

```bash
mysql -h <host> -u <user> -p < database/schema.sql
mysql -h <host> -u <user> -p < database/seed.sql
```

Use the resulting host, database, username, and password in both Render services.

## 2. Render

Create a Render Blueprint from `render.yaml`, or create the two services manually.

### `pixelbuy-api`

- Runtime: Docker
- Dockerfile path: `backend/Dockerfile`
- Docker context: `.`
- Public URL example: `https://pixelbuy.onrender.com`

Required environment variables:

```env
APP_URL=https://pixelbuy.onrender.com
CORS_ALLOWED_ORIGINS=https://pixel-buy.vercel.app
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=None
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
DB_SSL_MODE=REQUIRED
DB_SSL_CA=
GEMINI_API_KEY=...
```

### `pixelbuy-ai`

- Runtime: Python
- Build command: `pip install -r backend/requirements.txt`
- Start command: `python backend/scripts/gemini_live_server.py`
- Public websocket URL example: `wss://pixelbuy-ai.onrender.com/ws`

Required environment variables:

```env
LIVE_WS_HOST=0.0.0.0
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
DB_SSL_MODE=REQUIRED
DB_SSL_CA=
GEMINI_API_KEY=...
```

Render provides `PORT`; the websocket server uses it automatically when `LIVE_WS_PORT` is not set.

## 3. Vercel

Import the repo into Vercel and set:

- Root Directory: `web`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variables:

```env
VITE_API_BASE=https://pixelbuy.onrender.com
VITE_LIVE_WS_URL=wss://pixelbuy-ai.onrender.com/ws
```

After Vercel gives you the final production domain, update `CORS_ALLOWED_ORIGINS` on `pixelbuy-api` to that exact URL.

## 4. Smoke Test

After deployment:

1. Open the Vercel site.
2. Search products.
3. Register or log in.
4. Add an item to cart.
5. Open Pixie and check that the status says connected.
