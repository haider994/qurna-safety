# West Qurna Safety - Driver Violation Tracking System
## نظام تتبع مخالفات السائقين - حقل غرب القرنة النفطي

A full-stack web application for tracking driver traffic violations, automatically escalating warnings to suspensions and bans, and monitoring contractor safety performance at the West Qurna oil field.

## Features

- **Bilingual UI** - Full Arabic (RTL) and English support with one-click toggle
- **Drivers Management** - Full CRUD, contractor assignment, license expiry tracking
- **Contractors Management** - Track all contractor companies and their drivers
- **Violations Logging** - Record traffic violations with type, severity, location, photos
- **Auto-Escalation** - 1 → Notice, 2 → Warning, 3 → Suspension, 4+ → Banned
- **Instant Ban Override** - Critical violations (DUI, fatal accident, etc.) trigger immediate ban
- **Contractor Risk Watchlist** - Highlights contractors with high % of violating drivers
- **Dashboard** - Live stats, charts (status pie, daily trend, severity, top drivers/contractors)
- **PDF & Excel Reports** - Per-driver, per-contractor, and bulk exports
- **Audit Log** - Tamper-evident log of every create/update/delete and login
- **Role-Based Access** - Admin / Data Entry / Viewer roles
- **Security** - JWT auth, bcrypt password hashing, rate limiting, security headers
- **Mobile Responsive** - Works on phones, tablets, and desktops

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite (deploy on persistent volume), JWT, bcrypt
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, React Router 7
- **Reports**: openpyxl (Excel), reportlab (PDF)

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
DATA_DIR=./data uvicorn app.main:app --reload
```

The backend runs at http://127.0.0.1:8000. On first run, the admin user is bootstrapped:

- Username: `admin`
- Password: `ChangeMe!2025` (override with `BOOTSTRAP_ADMIN_PASSWORD` env var)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 - the dev server proxies `/api` requests to the backend.

### Single-domain deployment (frontend + backend bundled)

```bash
cd frontend && npm run build
cp -r dist ../backend/static
cd ../backend && uvicorn app.main:app
```

The backend serves both the API and the SPA from the same origin.

## Configuration (env vars)

| Var | Default | Description |
|---|---|---|
| `DATA_DIR` | `/data` | Directory for SQLite DB and JWT secret |
| `BOOTSTRAP_ADMIN_USERNAME` | `admin` | Bootstrap admin username |
| `BOOTSTRAP_ADMIN_PASSWORD` | `ChangeMe!2025` | Bootstrap admin password (only used if DB is empty) |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins, or `*` |
| `THRESHOLD_NOTICE` | `1` | Violation count → Notice status |
| `THRESHOLD_WARNING` | `2` | Violation count → Warning status |
| `THRESHOLD_SUSPENSION` | `3` | Violation count → Suspension |
| `THRESHOLD_BAN` | `4` | Violation count → Ban |
| `CONTRACTOR_WARN_PERCENT` | `30.0` | Contractor warning threshold (% of violating drivers) |
| `JWT_SECRET` | auto-generated | JWT signing secret (persisted in DATA_DIR) |

## License

Proprietary - West Qurna Oil Field Safety Department.
