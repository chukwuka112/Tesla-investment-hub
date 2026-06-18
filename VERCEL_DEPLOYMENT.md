# Tesla Investment Hub - Vercel Testing Deployment Guide

## 🚀 Quick Start for Vercel Deployment

### Prerequisites
- Vercel Account (free at https://vercel.com)
- GitHub repository connected to Vercel
- Environment variables configured

### Environment Variables to Add in Vercel Dashboard

1. **DATABASE_URL** - PostgreSQL connection string (required)
2. **JWT_SECRET** - Already set to: `tesla-invest-secret-key-2024`
3. **NOWPAYMENTS_API_KEY** - `7LVM3LMK5WNES9WH35ZXFK4N`
4. **NOWPAYMENTS_IPN_SECRET** - `sbp_2850174ee2a0c45a3ca7f35f7857c2444d3b0558ipn`
5. **NEXT_PUBLIC_SUPABASE_URL** - `https://bmtdkvxthqyjxyqjqhjn.supabase.co`
6. **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY** - `sb_publishable_ptAuYypwNzPemGpCL2k6XQ_bZ3ee4yB`
7. **SENDGRID_API_KEY** - Optional (for emails)

### Deployment Steps

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Select this GitHub repository
4. Configure project settings:
   - Framework: Other
   - Build Command: `pnpm run build`
   - Install Command: `pnpm install`
   - Output Directory: `artifacts/tesla-invest/dist`
5. Add environment variables
6. Click "Deploy"

### Project Structure for Vercel

```
tesla-invest/
├── api/                          # API routes (serverless functions)
│   └── index.ts                 # Main API handler
├── artifacts/
│   ├── tesla-invest/            # User frontend (deployed to /)
│   │   └── dist/
│   ├── admin-panel/             # Admin frontend (deployed to /admin)
│   │   └── dist/
│   └── api-server/              # API backend (deployed to /api)
│       └── dist/
└── vercel.json                  # Vercel configuration
```

### Testing URLs (after deployment)

- **User Site**: `https://your-project.vercel.app`
- **Admin Site**: `https://your-project.vercel.app/admin`
- **API Endpoint**: `https://your-project.vercel.app/api`
- **Deposits**: `https://your-project.vercel.app/api/deposits`
- **Now Payments Webhook**: `https://your-project.vercel.app/api/deposits/webhook`

### Local Testing Before Deployment

```bash
# Install dependencies
pnpm install

# Build everything
pnpm run build

# Test locally with Vercel CLI
npm i -g vercel
vercel dev

# Deploy to Vercel
vercel --prod
```

### Important Notes

- ✅ Replit configuration removed
- ✅ Vite configs optimized for Vercel
- ✅ API server configured for serverless functions
- ✅ Now Payments API key configured
- ✅ Supabase credentials ready

### Troubleshooting

**Build fails with PORT error**: Already fixed ✅
**Replit plugins missing**: Already removed ✅
**API not responding**: Check DATABASE_URL is set
**Payments failing**: Verify Now Payments keys in environment

### Database Setup

For the app to work, you need a PostgreSQL database:

**Option 1: Vercel PostgreSQL** (Recommended)
- Go to Vercel Dashboard → Integrations → PostgreSQL
- Create database
- Copy connection string to DATABASE_URL

**Option 2: Supabase PostgreSQL**
- Already configured with Supabase credentials
- Create a new PostgreSQL project on Supabase
- Use connection string as DATABASE_URL

**Option 3: External PostgreSQL**
- Any managed PostgreSQL service
- Add connection string to DATABASE_URL

### Next Steps

1. Add DATABASE_URL to Vercel environment variables
2. Run database migrations (if needed)
3. Deploy to Vercel
4. Test deposits and payments
5. Monitor logs in Vercel Dashboard

---

For more details on Vercel deployment: https://vercel.com/docs
