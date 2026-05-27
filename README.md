# SkillFlow — Live Skill Sharing Platform
> Built for ₹0 hosting cost. Free forever on free tiers.

## Stack
- **Frontend**: React + Vite + Vanilla CSS (deploy → Vercel free)
- **Backend**: Node.js + Express + Socket.io + SQLite (deploy → Render free)
- **Video**: WebRTC peer-to-peer (no media server cost)
- **Recording**: Browser MediaRecorder API (client-side, no storage cost)
- **DB**: SQLite file (zero cost, zero config)

---

## Local Development

### 1. Backend
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Free Deployment (₹0/month)

### Backend → Render.com (Free tier)
1. Push `backend/` to a GitHub repo
2. Go to render.com → New Web Service
3. Connect repo, set:
   - Build: `npm install`
   - Start: `node server.js`
   - Environment vars:
     - `JWT_SECRET` = any random string
     - `CLIENT_URL` = your Vercel frontend URL
4. Deploy. Get your Render URL (e.g. `https://skillflow-api.onrender.com`)

> ⚠️ Free Render spins down after 15min inactivity. First request is slow (~30s cold start).

### Frontend → Vercel (Free tier)
1. Push `frontend/` to a GitHub repo
2. Go to vercel.com → Import project
3. Set environment vars:
   - `VITE_API_URL` = your Render backend URL
   - `VITE_SOCKET_URL` = same Render URL
4. Deploy. Done.

---

## Features
- ✅ User auth (register/login with JWT)
- ✅ Create live sessions with title, description, category, tags
- ✅ WebRTC peer-to-peer live video (camera + audio)
- ✅ Host controls: mic toggle, cam toggle, end session
- ✅ Live chat during sessions (Socket.io)
- ✅ Viewer count in real-time
- ✅ Record session (host or viewer) — browser MediaRecorder
- ✅ Download recording as .webm file
- ✅ Persistent comments after session ends
- ✅ Browse sessions by category, status, search
- ✅ Light mode only, elegant design

## Known Free Tier Limits
- Render free: 512MB RAM, sleeps after inactivity
- WebRTC works peer-to-peer, so no cost scales with viewers
- SQLite is single-file, fine for small-medium load
- For high traffic: upgrade to Render paid ($7/mo) or use PlanetScale free tier

---

## Folder Structure
```
skillshare/
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── sessions.js
│   │   └── comments.js
│   ├── db.js
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── SessionCard.jsx
    │   │   ├── CreateSessionModal.jsx
    │   │   └── Toast.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Browse.jsx
    │   │   ├── Room.jsx
    │   │   └── Auth.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```
