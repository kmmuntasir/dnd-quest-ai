# Environment Variables

## Required Variables

### API Keys
```env
GROQ_API_KEY=your_groq_api_key_here
```
Your Groq API key. Get it from https://console.groq.com/

```env
POLLINATIONS_API_KEY=your_pollinations_api_key_here
```
Your Pollinations.ai API key. Get it from https://enter.pollinations.ai/

### AI Configuration
```env
GROQ_MODEL=llama-3.3-70b-versatile
```
The Groq model to use for text generation. Options:
- `llama-3.3-70b-versatile` (default, recommended)
- `llama-3.1-8b-instant`
- `mixtral-8x7b-32768`

## Optional Variables

### Server Configuration
```env
PORT=3000
```
Port number for the Express server. Default: 3000

```env
NODE_ENV=development
```
Environment mode. Options: `development`, `production`, `staging`

### Database Configuration
```env
DATABASE_PATH=../database/dnd-game.db
```
Path to SQLite database file. Relative to backend directory.

## Example .env Files

### Development
```env
GROQ_API_KEY=gsk_your_key_here
POLLINATIONS_API_KEY=sk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
NODE_ENV=development
DATABASE_PATH=../database/dnd-game.db
```

### Production
```env
GROQ_API_KEY=gsk_your_key_here
POLLINATIONS_API_KEY=sk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
NODE_ENV=production
DATABASE_PATH=/var/lib/dnd-game/dnd-game.db
```

## Security Notes

⚠️ **Important:** Never commit `.env` files to version control!

The `.env` file is included in `.gitignore` to protect your API keys.

When deploying to production:
1. Set environment variables in your hosting platform (Heroku, Vercel, etc.)
2. Or use a secret management service
3. Do not include the actual `.env` file in your deployment

---

*Last Updated: February 12, 2026*
