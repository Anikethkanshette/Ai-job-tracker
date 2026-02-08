# GitHub & Render Deployment Guide

## 📋 Deployment Checklist

✅ Code committed to git  
✅ render.yaml configured for both backend and frontend  
✅ Environment variables configured  
✅ Frontend API routing updated  
✅ Ready for production deployment  

---

## 🚀 Quick Start: Deploy to Render

### Step 1: Push to GitHub

```powershell
cd "C:\Users\Admin\Downloads\New folder"
git push origin main
```

**Note:** If you get "rejected" error, run:
```powershell
git pull origin main --no-edit
git push origin main
```

### Step 2: Go to Render.com

1. Visit https://render.com
2. Sign in with GitHub (authorize if prompted)
3. Click **Dashboard**

### Step 3: Create Blueprint Deployment

1. Click **New +** → **Blueprint**
2. Select repository: **Ai-job-tracker**
3. Branch: **main**
4. Click **Create from Blueprint**

Render will automatically read `render.yaml` and deploy:
- ✅ Backend service on port 3000
- ✅ Frontend service on port 5173

### Step 4: Set Required Environment Variables

**For Backend Service:**
1. Go to Settings
2. Add Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: `your-actual-gemini-api-key-here`
3. Click Save

The backend will **restart automatically** with the new key.

**For Frontend Service:**
1. Go to Settings
2. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://ai-job-tracker-backend.onrender.com/api`
   
   (Replace `ai-job-tracker-backend` with your actual backend service name)
3. Click Save

### Step 5: Wait for Deployment

- Backend deploys in ~5-10 minutes
- Frontend deploys in ~3-5 minutes
- Monitor the **Logs** tab for any build errors

### Step 6: Test Your Deployment

**Test Backend:**
```
https://your-backend-service.onrender.com/health
```
Should return:
```json
{"status":"ok","timestamp":"2026-02-07T..."}
```

**Test Frontend:**
Visit your frontend URL and login with:
- Email: `test@gmail.com`
- Password: `test@123`

---

## 🔧 Manual Deployment (If Blueprint Fails)

### Deploy Backend Manually

1. Click **New +** → **Web Service**
2. Select repository
3. Build settings:
   - Name: `ai-job-tracker-backend`
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Environment:
   - `PORT` = `3000`
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = (your key)
5. Click **Create Web Service**

### Deploy Frontend Manually

1. Click **New +** → **Web Service**
2. Select repository
3. Build settings:
   - Name: `ai-job-tracker-frontend`
   - Root Directory: `frontend`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build && npm install -g serve`
   - Start Command: `serve -s dist -l 5173`
4. Environment:
   - `VITE_API_URL` = `https://ai-job-tracker-backend.onrender.com/api`
5. Click **Create Web Service**

---

## 📝 Project Files Configured for Render

### render.yaml
- Defines both services in YAML format
- Specifies build/start commands
- Sets environment variable placeholders
- Enables auto-deploy on push

### frontend/.env.example
```
VITE_API_URL=http://localhost:3000/api
```

### frontend/src/services/api.js
- Updated to use `VITE_API_URL` environment variable
- Falls back to `/api` for local development

### backend/.env.example
```
PORT=3000
GEMINI_API_KEY=AIzaSyB7UttQRYuiMNFU9_wXVVCRX0zfwu6wMG4
```

---

## 🐛 Troubleshooting

### Backend won't start - "GEMINI_API_KEY not found"
✅ Solution: Add the environment variable in Render Dashboard
- Service → Settings → Environment → Add `GEMINI_API_KEY`

### Frontend shows "Can't reach API"
✅ Solution: Check `VITE_API_URL` environment variable
- Copy exact backend URL from Render Dashboard
- Frontend → Settings → Environment → Verify `VITE_API_URL`

### Build fails: "npm: command not found"
✅ Solution: Ensure Node runtime is selected
- Service → Settings → Runtime should be "Node"

### Static files return 404
✅ Solution: Frontend must use `serve` to run built files
- Start Command should be: `serve -s dist -l 5173`

### Service stuck "deploying"
✅ Solution: Check build logs
- Click service → Logs tab
- Look for error messages
- Click redeploy button if needed

---

## 📊 Service URLs After Deployment

| Service | URL | Purpose |
|---------|-----|---------|
| Backend | `https://ai-job-tracker-backend.onrender.com` | API endpoints |
| Backend Health | `https://ai-job-tracker-backend.onrender.com/health` | Health check |
| Frontend | `https://ai-job-tracker-frontend.onrender.com` | Web application |

---

## 🔐 Security Notes

- **Never commit `.env` files** - Use environment variables in Render Dashboard
- **Regenerate API keys** if accidentally exposed in git history
- **Keep GEMINI_API_KEY private** - Only in Render environment, never in code
- **Use HTTPS** - Render provides free SSL certificates

---

## 📱 Features Deployed

✅ AI-powered job matching with Gemini  
✅ Resume upload & analysis  
✅ Job recommendations by role  
✅ Real-time filtering  
✅ Application tracking  
✅ AI assistant chatbot  

---

## ✨ Next Steps

1. **Go live:** Push to GitHub → Deploy on Render
2. **Monitor:** Check Render Dashboard → Logs
3. **Test:** Visit frontend URL → Login → Upload resume
4. **Share:** Get your live URL and share with team!

---

**Questions?** Check [RENDER_QUICK_START.md](RENDER_QUICK_START.md) or Render documentation at https://render.com/docs
