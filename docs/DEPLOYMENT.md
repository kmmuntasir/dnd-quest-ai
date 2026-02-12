# D&D AI - Deployment Guide

## Overview

This guide covers deploying both the backend (Express + SQLite) and frontend (React + Vite) to production.

---

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)
- **Pros:** Free, automatic deploys, global CDN, easy preview URLs
- **Cons:** Serverless functions, build time limit (10s free tier)
- **Best for:** Frontend only (backend needs separate hosting)

### Option 2: Railway (Recommended for Full Stack)
- **Pros:** Simple deployment, generous free tier, supports both frontend + backend
- **Cons:** Free tier has limited resources
- **Best for:** Full-stack deployment with database

### Option 3: Render (Alternative)
- **Pros:** Free SSL, multiple services, persistent databases
- **Cons:** Spin down on free tier after inactivity
- **Best for:** Backend with persistent storage

### Option 4: Self-hosted (VPS/VPS)
- **Pros:** Full control, no limits, cost-effective long-term
- **Cons:** Requires server management, security maintenance
- **Best for:** Production workloads with custom requirements

---

## Prerequisites

- Node.js v18+
- Git repository
- Package manager (npm or yarn)
- Environment variables (API keys, database path)

---

## Option 1: Vercel (Frontend Only)

### Backend Deployment

1. Choose a backend provider:
   - **Railway** (Recommended - free tier)
   - **Render**
   - **Heroku** (paid)
   - **DigitalOcean** (VPS)

2. Deploy backend:
   ```bash
   # Using Railway
   railway init
   railway add
   railway deploy

   # Or using Render
   # Create `render.yaml`:
   services:
     - type: web
       name: dnd-ai-backend
       env: node
       plan: free
       buildCommand: npm install
       startCommand: npm start
   ```
   
3. Add environment variables in provider dashboard:
   - `GROQ_API_KEY`
   - `GROQ_MODEL`
   - `POLLINATIONS_API_KEY`
   - `DATABASE_PATH`
   - `NODE_ENV=production`

4. Note the backend URL for frontend connection

### Frontend Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   vercel login
   ```

2. Deploy frontend:
   ```bash
   cd frontend
   vercel
   ```

3. Configure environment variables in Vercel dashboard:
   - `VITE_API_URL=your-backend-url`
   - `VITE_NODE_ENV=production`

4. Update `frontend/.env`:
   ```env
   VITE_API_URL=https://your-backend-url
   VITE_NODE_ENV=production
   ```

---

## Option 2: Railway (Full Stack)

### Deploy to Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. Create `railway.toml`:
   ```toml
   [build]
     builder = "NIXPACKS_IMAGE"
     buildCommand = "npm install && npm run build"

   [deploy]
     startCommand = "npm start"
     healthcheckPath = "/health"
     healthcheckTimeout = 100

   [env]
     NODE_ENV = "production"
     PORT = "3000"
   ```

3. Push to Railway:
   ```bash
   railway init
   railway add
   railway deploy
   ```

4. Configure environment variables in Railway dashboard

---

## Option 3: Render

### Backend Deployment

1. Create `backend/render.yaml`:
   ```yaml
   services:
     - type: web
       name: dnd-ai-backend
       runtime: node
       plan: free
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 3000
       healthCheck:
         http:
           path: /health
           initialDelaySeconds: 10
           periodSeconds: 10
           timeoutSeconds: 30
   ```

2. Deploy to Render:
   ```bash
   # Install Render CLI
   npm install -g @renderapp/render-cli

   # Deploy
   render deploy
   ```

3. Add environment variables in Render dashboard

### Frontend Deployment

1. Create `frontend/render.yaml`:
   ```yaml
   services:
     - type: web
       name: dnd-ai-frontend
       runtime: static
       buildCommand: npm run build
       publishDir: dist
       envVars:
         - key: VITE_API_URL
           value: your-backend-url
         - key: VITE_NODE_ENV
           value: production
   ```

2. Deploy frontend:
   ```bash
   render deploy
   ```

---

## Option 4: Self-Hosted (VPS/VPS)

### Server Setup

1. Install Node.js and npm:
   ```bash
   sudo apt-get update
   sudo apt-get install -y nodejs npm
   ```

2. Clone repository:
   ```bash
   git clone your-repo-url
   cd dungeons-and-dragons
   ```

3. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Set up environment variables:
   ```bash
   # Create .env files
   cd backend
   nano .env
   cd ../frontend
   nano .env
   ```

### Using PM2 (Process Manager)

1. Install PM2:
   ```bash
   sudo npm install -g pm2
   ```

2. Start backend:
   ```bash
   cd backend
   pm2 start npm
   ```

3. Start frontend:
   ```bash
   cd ../frontend
   pm2 start npm run dev
   ```

4. Set up PM2 monitoring:
   ```bash
   pm2 monitor
   pm2 logs
   ```

### Using Systemd (Service)

1. Create `backend.service`:
   ```ini
   [Unit]
   Description=D&D AI Backend
   After=network.target
   Wants=network-online.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/backend
   Environment=NODE_ENV=production
   ExecStart=/usr/bin/npm start
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable dnd-ai-backend
   sudo systemctl start dnd-ai-backend
   ```

### Nginx Configuration

1. Create Nginx reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location /api/ {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
       }

       location / {
           proxy_pass http://localhost:5173; # Vite dev server
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
       }
   }
   ```

2. Restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

### SSL Certificate

Let's Encrypt (Free):
```bash
sudo apt-get install -y certbot
sudo certbot --nginx -d your-domain.com
```

---

## Database Migration

If moving from SQLite to PostgreSQL:

### Backend Changes

1. Install dependencies:
   ```bash
   cd backend
   npm install pg
   npm install -D @types/pg
   npm install knex
   ```

2. Update database configuration:
   ```javascript
   // src/config/database.js
   const { Pool } = require('pg');
   const pool = new Pool({
     user: process.env.DB_USER,
     host: process.env.DB_HOST,
     database: process.env.DB_NAME,
     password: process.env.DB_PASSWORD,
     port: 5432,
   });
   ```

3. Migration script:
   ```javascript
   // migrations/001_initial.js
   exports.up = (pg) => {
     return pg.schema`
       CREATE TABLE IF NOT EXISTS adventures (
         id SERIAL PRIMARY KEY,
         title TEXT NOT NULL
         ...
       );
     `;
   };
   ```

---

## Environment Variables

### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
POLLINATIONS_API_KEY=your_pollinations_api_key

NODE_ENV=production
PORT=3000
DATABASE_PATH=database/dnd-game.db

# Optional: Database for PostgreSQL
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url
VITE_NODE_ENV=production
```

---

## Performance Optimization

### Frontend Build
```bash
cd frontend
npm run build
```

### Enable Production Mode
```javascript
// vite.config.js
export default {
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          reactRouter: ['react-router-dom']
        }
      }
    }
  }
}
```

### Backend Optimization
```javascript
// Add compression
const compression = require('compression');
app.use(compression());

// Enable gzip
const helmet = require('helmet');
app.use(helmet());
```

---

## Monitoring & Logging

### Application Performance Monitoring
- **New Relic** (Free tier available)
- **DataDog** (Free tier available)
- **Sentry** (Error tracking)

### Uptime Monitoring
- **UptimeRobot** (Free)
- **Pingdom** (Free tier)
- **StatusCake** (Free tier)

---

## Security Checklist

### Before Deployment

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Set up rate limiting
- [ ] Implement CORS properly
- [ ] Validate all user inputs
- [ ] Use parameterized queries (SQL injection prevention)
- [ ] Remove debug logging in production
- [ ] Add security headers (helmet)
- [ ] Implement authentication (future requirement)
- [ ] Add logging for security incidents
- [ ] Regular dependency updates
- [ ] Backup database regularly

---

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear cache
rm -rf node_modules
npm install
```

**Runtime Errors:**
```bash
# Check logs
pm2 logs
# Or for systemd
journalctl -u dnd-ai-backend -f
```

**Connection Issues:**
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check frontend build
cd frontend
npm run preview
```

---

## Continuous Deployment

### CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: |
          railway deploy

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: |
          vercel --prod
```

---

## Rollback Strategy

### Automated Rollback
- Keep last 3 versions deployed
- Configure health check endpoint
- Use database migrations (version-controlled)
- Set up alerts for deployment failures

### Manual Rollback
```bash
# Railway
railway rollback

# Vercel
vercel rollback

# Git
git revert <commit-hash>
git push origin main
```

---

## Post-Deployment Checklist

- [ ] Verify health check endpoint
- [ ] Test API endpoints
- [ ] Test frontend loading
- [ ] Verify API connectivity
- [ ] Test game flow (character creation → gameplay → save/load)
- [ ] Check error logs
- [ ] Verify database persistence
- [ ] Test on mobile devices
- [ ] Test accessibility with screen reader
- [ ] Load test critical paths
- [ ] Set up monitoring and alerts
- [ ] Create database backups
- [ ] Document deployment process
- [ ] Share deployment URL with team

---

*Last Updated: February 12, 2026*
