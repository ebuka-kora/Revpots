# 🚀 Deploy RevPilot to Vercel

## Quick Start

### Prerequisites
1. **Vercel Account**: [vercel.com](https://vercel.com) (free)
2. **MongoDB Atlas**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
3. **GitHub Account** (optional, for auto-deploy)

---

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier: M0)
4. Create a database user (username/password)
5. Whitelist IP: `0.0.0.0/0` (allow all IPs for Vercel)
6. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/revpilot
   ```

---

## Step 2: Deploy Backend API

### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** (or drag & drop `backend` folder)
3. **Project Settings**:
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
4. **Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/revpilot
   NODE_ENV=production
   ```
5. Click **Deploy**

### Option B: Using Vercel CLI

```bash
cd backend
npm install -g vercel
vercel
# Follow prompts
# Add environment variables when asked
```

### Get Your Backend URL

After deployment, you'll get:
```
https://revpilot-backend.vercel.app
```

Your API endpoints will be at:
```
https://revpilot-backend.vercel.app/api
```

**Test it:**
```bash
curl https://revpilot-backend.vercel.app/api/health
```

---

## Step 3: Deploy Frontend (PWA)

### Option A: Using Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** (or drag & drop `Revpilot` folder)
3. **Project Settings**:
   - **Root Directory**: `Revpilot`
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export:web`
   - **Output Directory**: `web-build`
4. **Environment Variables**:
   ```
   EXPO_PUBLIC_API_URL=https://revpilot-backend.vercel.app/api
   ```
   (Replace with your actual backend URL)
5. Click **Deploy**

### Option B: Using Vercel CLI

```bash
cd Revpilot
vercel
# Follow prompts
# Add EXPO_PUBLIC_API_URL environment variable
```

---

## Step 4: Update Frontend API URL

After backend deployment, update frontend environment:

1. In Vercel Dashboard → Your Frontend Project → Settings → Environment Variables
2. Add/Update:
   ```
   EXPO_PUBLIC_API_URL=https://your-backend-url.vercel.app/api
   ```
3. Redeploy frontend (or it will auto-deploy if connected to Git)

---

## ✅ Verify Deployment

### Test Backend
```bash
curl https://your-backend.vercel.app/api/health
# Should return: {"status":"ok","message":"RevPilot API is running"}
```

### Test Frontend
1. Open your frontend URL
2. Go to Settings → Sync with Server
3. Click "Check Connection"
4. Should show "Connected" ✅

### Test PWA
1. Open frontend in Chrome/Edge
2. Look for install prompt
3. Or: Menu → "Install RevPilot"
4. App should install and work offline

---

## 🔄 Updating Deployments

### Automatic (GitHub)
- Push to GitHub → Vercel auto-deploys
- Make sure both projects are connected to your repo

### Manual
```bash
# Backend
cd backend
vercel --prod

# Frontend
cd Revpilot
vercel --prod
```

---

## 🐛 Troubleshooting

### Backend Issues

**"Cannot find module"**
- Check `package.json` has all dependencies
- Verify `api/index.js` paths are correct

**MongoDB Connection Fails**
- Verify `MONGODB_URI` in Vercel environment variables
- Check MongoDB Atlas IP whitelist (should be `0.0.0.0/0`)
- Verify database user credentials

**CORS Errors**
- Backend already has CORS enabled
- If issues persist, check frontend URL is allowed

### Frontend Issues

**API Calls Fail**
- Check `EXPO_PUBLIC_API_URL` environment variable
- Verify backend URL is correct (no trailing slash)
- Check browser console for errors

**Build Fails**
- Run locally first: `npx expo export:web`
- Check for TypeScript/import errors
- Verify all dependencies are in `package.json`

**PWA Not Installable**
- Must be HTTPS (Vercel does this automatically)
- Check `manifest.json` exists in build
- Verify icons are present

---

## 📱 Mobile Apps

For iOS/Android, you can still build with Expo:

```bash
cd Revpilot
# iOS
npx expo build:ios

# Android
npx expo build:android
```

Or use EAS Build:
```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

---

## 🎉 You're Live!

Your app is now:
- ✅ Deployed as PWA on Vercel
- ✅ Backend API on Vercel serverless
- ✅ MongoDB cloud database
- ✅ Works offline + syncs to cloud
- ✅ Accessible worldwide

**Frontend**: `https://revpilot-frontend.vercel.app`  
**Backend**: `https://revpilot-backend.vercel.app/api`

Enjoy! 🚀
