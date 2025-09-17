# Caja SAS Enterprise - Deployment Guide

## 🚀 Vercel Deployment

### Current Configuration
- **Repository:** https://github.com/Mike861205/cajavscode
- **Branch:** main
- **Build Command:** `npm run build`
- **Output Directory:** `dist/public`

### Build Process
1. Frontend (React + Vite) builds to `dist/public/`
2. Backend (Node.js + Express) builds to `dist/index.js`
3. Vercel serves frontend as SPA and backend as serverless functions

### Key Files
- `vercel.json` - Routing and build configuration
- `.vercelignore` - Files excluded from deployment
- `vite.config.ts` - Frontend build configuration
- `client/public/_redirects` - SPA routing fallback

### Environment Variables Required
```
DATABASE_URL=your_neon_postgresql_url
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=your_email
```

### Manual Redeploy
If automatic deployment fails:
1. Go to Vercel dashboard
2. Select your project
3. Click "Redeploy" button
4. Choose latest commit from main branch

### Troubleshooting
- Ensure all environment variables are set in Vercel
- Check build logs for any missing dependencies
- Verify that `dist/public/index.html` is generated correctly
- Confirm API routes are working at `/api/*`

### Local Development
```bash
npm install
npm run dev
# Server runs on http://localhost:5000
```