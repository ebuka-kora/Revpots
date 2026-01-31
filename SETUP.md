# RevPilot - PWA + MongoDB Backend Setup Guide

## ✅ What's Been Added

### 1. PWA Configuration
- Updated `app.json` with web manifest for PWA support
- App can now be installed as a Progressive Web App

### 2. Backend API (MongoDB)
- Complete Express.js backend with MongoDB
- RESTful API endpoints for products and invoices
- Sync endpoints for bidirectional data sync

### 3. Frontend Sync Integration
- API client (`utils/api.ts`)
- Sync utilities (`utils/sync.ts`)
- Sync screen (`app/settings/sync.tsx`)
- Database sync tracking columns

## 🚀 Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up MongoDB:**
   - Option A: Local MongoDB
     ```bash
     # Install MongoDB locally, then:
     mongod
     ```
   - Option B: MongoDB Atlas (Cloud - Recommended)
     - Go to https://www.mongodb.com/cloud/atlas
     - Create a free cluster
     - Get your connection string

4. **Create `.env` file:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/revpilot
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/revpilot
NODE_ENV=development
API_BASE_URL=http://localhost:3000/api
```

5. **Start the backend server:**
```bash
npm run dev
```

The server will run on `http://localhost:3000`

### Frontend Setup

1. **Install new dependency:**
```bash
cd Revpilot
npm install expo-secure-store
```

2. **Create `.env` file:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For production, update to your deployed backend URL:
```env
EXPO_PUBLIC_API_URL=https://your-backend.herokuapp.com/api
```

3. **Start the app:**
```bash
npm start
```

## 📱 Using Sync Feature

1. **Open Settings** in the app
2. **Tap "Sync with Server"**
3. **Check Connection** - Verifies if backend is reachable
4. **Full Sync** - Pulls all data from server, then pushes local changes
5. **Pull from Server** - Downloads all data from MongoDB
6. **Push to Server** - Uploads local data to MongoDB

## 🔄 How Sync Works

- **Offline-First**: App works completely offline using SQLite
- **Bidirectional Sync**: 
  - Pull: Downloads data from MongoDB to local SQLite
  - Push: Uploads local SQLite data to MongoDB
- **Conflict Resolution**: Server data takes precedence on pull
- **Device Tracking**: Each device has a unique ID for multi-device support

## 🌐 Deploying Backend

### Option 1: Heroku

1. Install Heroku CLI
2. Create app: `heroku create revpilot-backend`
3. Add MongoDB: `heroku addons:create mongolab:sandbox`
4. Deploy: `git push heroku main`
5. Update frontend `.env`: `EXPO_PUBLIC_API_URL=https://revpilot-backend.herokuapp.com/api`

### Option 2: Vercel/Netlify

1. Connect your GitHub repo
2. Set environment variables (MONGODB_URI)
3. Deploy
4. Update frontend `.env` with deployed URL

### Option 3: Railway/Render

1. Connect repo
2. Set MONGODB_URI
3. Deploy
4. Update frontend `.env`

## 📦 Building PWA

To build for web/PWA:

```bash
cd Revpilot
npx expo export:web
```

The output will be in `web-build/` directory.

## 🧪 Testing

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd Revpilot && npm start`
3. Open app and go to Settings > Sync with Server
4. Check connection - should show "Connected"
5. Try Full Sync

## 📝 API Endpoints

- `GET /api/health` - Health check
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/sync/all` - Get all data (for pull)
- `POST /api/sync/push` - Push local data (for push)

## 🔐 Security Notes

- Currently no authentication (single-user app)
- For production, consider adding:
  - JWT authentication
  - API rate limiting
  - Input validation
  - HTTPS only

## 🐛 Troubleshooting

**Backend won't start:**
- Check MongoDB is running
- Verify MONGODB_URI in `.env`
- Check port 3000 is available

**Sync fails:**
- Verify backend is running
- Check EXPO_PUBLIC_API_URL in frontend `.env`
- Check network connection
- Review backend logs

**PWA not working:**
- Ensure `app.json` has web manifest
- Build with `expo export:web`
- Serve over HTTPS (required for PWA)

## 📚 Next Steps

1. Deploy backend to cloud
2. Update frontend `.env` with production URL
3. Build and deploy PWA
4. Test sync across multiple devices
5. Consider adding authentication for multi-user support
