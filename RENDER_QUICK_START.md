# Render Deployment Guide

This project is configured for one-click deployment on Render using `render.yaml`.

## Prerequisites
- GitHub account with repository push access
- Gemini API key (get from https://makersuite.google.com/app/apikey)
- Render account (create at https://render.com)

## Option 1: Deploy Using render.yaml (Recommended)

### Step 1: Push to GitHub
```bash
cd "C:\Users\Admin\Downloads\New folder"
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### Step 2: Create Render Blueprint
1. Go to https://render.com/
2. Click "Dashboard" → "New +" → "Blueprint"
3. Connect your GitHub repository
4. Select branch: `main`
5. Click "Create from Blueprint"
6. Render will read `render.yaml` and create both services automatically

### Step 3: Configure Environment Variables
In Render Dashboard:
1. Go to **Backend Service** settings
2. Add environment variable:
   - Key: `GEMINI_API_KEY`
   - Value: (paste your Gemini API key)
3. Click "Save"
4. Deploy will restart automatically

### Step 4: Update Frontend API URL
1. Go to **Frontend Service** settings
2. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://ai-job-tracker-backend.onrender.com/api` (replace with your backend URL)
3. Click "Save"

## Option 2: Manual Deployment (If Blueprint Fails)

### Deploy Backend
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Settings:
   - Name: `ai-job-tracker-backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `backend`
4. Add Env Vars: `PORT=3000`, `GEMINI_API_KEY=your-key`
5. Create Service

### Deploy Frontend
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Settings:
   - Name: `ai-job-tracker-frontend`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build && npm install -g serve`
   - Start Command: `serve -s dist -l 5173`
   - Root Directory: `frontend`
4. Add Env Vars: `VITE_API_URL=https://your-backend-url.onrender.com/api`
5. Create Service

## Verify Deployment

**Backend Health Check:**
```
https://your-backend.onrender.com/health
```
Should return:
```json
{"status":"ok","timestamp":"2026-02-07T..."}
```

**Frontend:**
```
https://your-frontend.onrender.com
```
Should load the login page

## Environment Variables Needed

### Backend (.env)
```
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your-gemini-api-key-here
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

## Troubleshooting

### Backend won't start
- Check `GEMINI_API_KEY` is correctly set
- Check logs: Render Dashboard → Select Service → Logs
- Verify `npm start` works locally: `cd backend && npm start`

### Frontend shows "Can't connect to API"
- Verify backend URL in frontend env vars
- Check CORS is enabled (it is by default)
- Check browser console for errors

### Static files not loading
- Verify `dist` folder exists after build
- Check `npm run build` works locally

## Local Testing Before Deploy

```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 and test with demo credentials:
- Email: test@gmail.com
- Password: test@123

## Done! 🚀
Your AI Job Tracker is live on Render!
