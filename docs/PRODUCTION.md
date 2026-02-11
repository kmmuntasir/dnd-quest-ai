# Production Deployment Guide

## Deployment Options

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
cd backend
vercel
```

4. Set environment variables in Vercel dashboard:
   - GROQ_API_KEY
   - POLLINATIONS_API_KEY
   - NODE_ENV=production
   - PORT=3000

### Option 2: Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Create project and deploy:
```bash
cd backend
railway init
railway up
```

4. Add environment variables in Railway dashboard.

### Option 3: Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure build and start commands:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables in Render dashboard.

### Option 4: Self-hosted (VPS/Docker)

Using Docker:

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. Build and run:
```bash
docker build -t dnd-backend .
docker run -p 3000:3000 --env-file .env dnd-backend
```

## Production Checklist

Before deploying to production:

### Security
- [ ] All API keys are set as environment variables (not hardcoded)
- [ ] `.env` is in `.gitignore`
- [ ] CORS is configured for production domains
- [ ] Rate limiting is implemented (if needed)
- [ ] Input validation is in place

### Configuration
- [ ] `NODE_ENV=production` is set
- [ ] Port is properly configured
- [ ] Database path is writable
- [ ] Logging is configured for production

### Performance
- [ ] Dependencies are up to date
- [ ] Code is minified (if using bundler)
- [ ] Database queries are optimized
- [ ] API response times are acceptable

### Monitoring
- [ ] Health check endpoint is accessible
- [ ] Error logging is configured
- [ ] Performance monitoring is set up (optional)
- [ ] Uptime monitoring is configured (optional)

### Backup
- [ ] Database backup strategy is in place
- [ ] Recovery procedures are documented

## Environment-Specific Configs

### Development (.env.development)
```env
GROQ_API_KEY=gsk_your_key_here
POLLINATIONS_API_KEY=sk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
NODE_ENV=development
DATABASE_PATH=../database/dnd-game.db
```

### Production (.env.production)
```env
GROQ_API_KEY=gsk_your_key_here
POLLINATIONS_API_KEY=sk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
NODE_ENV=production
DATABASE_PATH=/var/lib/dnd-game/dnd-game.db
```

## Monitoring

### Health Checks

The backend provides a health check endpoint at `/health`:

```bash
curl https://your-api.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-12T00:00:00.000Z"
}
```

### AI Service Status

Check AI service connections:

```bash
curl https://your-api.com/api/settings/ai/test
```

## Troubleshooting Production Issues

### API Timeouts

If Groq API calls are timing out:
1. Check Groq API status page
2. Verify your API key is valid
3. Consider implementing retry logic with exponential backoff

### Database Errors

If database errors occur:
1. Ensure the database file path is writable
2. Check disk space
3. Verify SQLite version compatibility
4. Implement database backups

### High Memory Usage

If memory usage is high:
1. Optimize database queries
2. Implement connection pooling (if moving to PostgreSQL)
3. Add rate limiting
4. Monitor with tools like New Relic or Datadog

## Scaling

### Vertical Scaling

Increase server resources:
- More CPU
- More RAM
- Faster storage

### Horizontal Scaling

Load balance across multiple instances:
1. Use a load balancer (Nginx, AWS ALB, etc.)
2. Use a shared database (PostgreSQL, MySQL)
3. Implement session management across instances

### Database Migration

To move from SQLite to PostgreSQL:

1. Export SQLite data:
```bash
sqlite3 dnd-game.db .dump > backup.sql
```

2. Import to PostgreSQL:
```bash
psql -U username -d dbname < backup.sql
```

3. Update database connection in code to use `pg` library instead of `better-sqlite3`

---

*Last Updated: February 12, 2026*
