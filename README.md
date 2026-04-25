# رحّال (Rahhal) — Warehouse Management System

An Arabic-first, multi-branch warehouse management system built for Egyptian businesses.

## Stack

- **Frontend**: React (Vite) + Tailwind CSS + i18next + Zustand — PWA
- **Backend**: Node.js + Express + PostgreSQL + WebSockets
- **Reverse Proxy**: Nginx
- **Infrastructure**: Docker Compose

## Project Rules

- Backend code, API routes, variable names, file names — all in English
- Frontend UI — all in Arabic, all text via i18n (no hardcoded Arabic in components)
- Font: Cairo (Google Fonts) — RTL layout
- Dates: Gregorian — Numbers: Western (0-9)
- Always use **مخزن** — never مستودع
- No hardcoded Arabic text in components — everything goes through `i18n/ar.json`

## Branches & Colors

| Branch            | Color  |
| ----------------- | ------ |
| فرع المنشيه       | Green  |
| فرع سموحه         | Orange |
| فرع المنشيه النجف | Blue   |

## Roles (fixed hierarchy)

| Role       | Arabic                                                        |
| ---------- | ------------------------------------------------------------- |
| owner      | صاحب النظام — single hardcoded user, not scoped to any branch |
| admin      | مدير النظام                                                   |
| supervisor | مشرف المخزن                                                   |
| worker     | موظف                                                          |
| viewer     | مشاهد                                                         |

## Setup

```bash
# 1. Clone the repo
git clone
cd rahhal

# 2. Create your env file
cp .env.docker.example .env.docker
# Fill in your values — especially POSTGRES_PASSWORD and OWNER_PASSWORD

# 3. Boot
docker-compose --env-file .env.docker up --build

# 4. Access
# http://localhost
```

## Environment Variables

See `.env.docker.example` for all required variables.

Key variables:

- `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` — database credentials
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — must be at least 32 chars, already generated in example
- `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_NAME_AR`, `OWNER_NAME_EN` — seeded once on first boot

## Boot Sequence

postgres (healthy) → backend (migrate → seed → listen) → frontend → nginx

## Project Structure

rahhal/
├── docker-compose.yml
├── .env.docker.example
├── nginx/
│ └── nginx.conf
├── backend/
│ └── src/
│ ├── index.js # Express app entry point
│ ├── db/
│ │ ├── pool.js # PostgreSQL connection pool
│ │ ├── migrate.js # Runs migrations on boot
│ │ ├── seed.js # Seeds owner account on first boot
│ │ └── migrations/
│ │ └── 001_initial_schema.sql
│ ├── middleware/
│ │ ├── auth.js # JWT authentication
│ │ └── roles.js # Role-based access control
│ └── ws/
│ └── socket.js # WebSocket server + broadcast
└── frontend/
└── src/
├── i18n/
│ ├── ar.json # All Arabic UI strings
│ └── en.json # English equivalents
├── App.jsx # Router + protected route wrapper
└── main.jsx # Entry point, sets RTL

## Smoke Tests

```bash
# All containers healthy
docker-compose ps

# API reachable through nginx
curl http://localhost/api/auth

# Database tables
docker-compose exec postgres psql -U rahhal_user -d rahhal_db -c '\dt'

# Owner account
docker-compose exec postgres psql -U rahhal_user -d rahhal_db -c "SELECT email, role FROM users;"
```
