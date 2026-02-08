# 🚀 Step-by-Step Render Deployment Guide

## Prerequisites Check

Before starting, make sure you have:
- ✅ GitHub account
- ✅ Render account (https://render.com - free)
- ✅ Gemini API key (get from https://makersuite.google.com/app/apikey)
- ✅ Code pushed to GitHub (already done!)

---

## STEP 1: Verify GitHub Repository

Your code is already on GitHub at:
```
https://github.com/Anikethkanshette/Ai-job-tracker
```

**Verify it's there:**
1. Visit the URL above in your browser
2. You should see your repository with all files
3. Check you're on the `main` branch

---

## STEP 2: Go to Render.com

1. Open https://render.com in your browser
2. If not logged in, click **"Sign up"** (prefer **Sign up with GitHub**)
3. Authorize Render to access your GitHub repos
4. You'll be redirected to the Render Dashboard

---

## STEP 3: Deploy with Blueprint (EASIEST - Recommended)

### Option A: Blueprint Deployment (Automatic)

1. In Render Dashboard, click **"New +"** button (top right)
2. Select **"Blueprint"**
3. You'll see your GitHub repos
4. Find and select: **`Ai-job-tracker`**
5. Branch: Make sure it says **`main`**
6. Click **"Create from Blueprint"**

**What happens next:**
- Render reads your `render.yaml` file
- Automatically creates TWO services:
  - Backend Web Service
  - Frontend Web Service
- Both start building (takes 8-15 minutes)

### Option B: Manual Deployment (If Blueprint doesn't work)

Skip to STEP 4 below.

---

## STEP 4: Configure Environment Variables

### ⚠️ IMPORTANT - Do this while services are building

**For Backend Service:**

1. In Render Dashboard, find the service named: **`ai-job-tracker-backend`**
2. Click on it to open settings
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Fill in:
   ```
   Key:   GEMINI_API_KEY
   Value: (Paste your actual Gemini API key here)
   ```
6. Click **"Save"**
7. Service will automatically restart with the new key ✅

**For Frontend Service (if deploying manually):**

1. Find service: **`ai-job-tracker-frontend`**
2. Click it to open settings
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Fill in:
   ```
   Key:   VITE_API_URL
   Value: https://ai-job-tracker-backend.onrender.com/api
   ```
   *(Replace `ai-job-tracker-backend` with your actual backend service name)*
6. Click **"Save"**

---

## STEP 5: Wait for Deployment

**Backend:** 
- Status will show "Building..." then "Live"
- Takes 5-10 minutes

**Frontend:**
- Status will show "Building..." then "Live"  
- Takes 3-8 minutes

**How to monitor:**
1. Click on each service
2. Go to **"Logs"** tab
3. Watch the build progress
4. If there are errors, they'll appear here

---

## STEP 6: Get Your Live URLs

Once both services show **"Live"** status:

1. Click on **`ai-job-tracker-backend`** service
2. Copy the URL at the top (e.g., `https://ai-job-tracker-backend.onrender.com`)
3. Click on **`ai-job-tracker-frontend`** service
4. Copy the URL at the top (e.g., `https://ai-job-tracker-frontend.onrender.com`)

**Save these URLs** - you'll use them to access your app!

---

## STEP 7: Test Your Deployment

### Test Backend Health Check
1. Open this URL in your browser:
   ```
   https://ai-job-tracker-backend.onrender.com/health
   ```
2. You should see:
   ```json
   {
     "status": "ok",
     "timestamp": "2026-02-07T..."
   }
   ```
3. If you see this → Backend is working! ✅

### Test Frontend (Main App)
1. Open your frontend URL in browser:
   ```
   https://ai-job-tracker-frontend.onrender.com
   ```
2. You should see the **Login page** with "AI Job Tracker" title

---

## STEP 8: Login to Your App

1. When you see the login page, use demo credentials:
   ```
   Email:    test@gmail.com
   Password: test@123
   ```
2. Click **"Login"**

If login works → **Congratulations!** Your backend is connected! ✅

---

## STEP 9: Test Resume Upload Feature

1. After logging in, you'll be asked to upload a resume
2. Create a simple test resume or use any PDF/TXT file
3. Upload it
4. You should see:
   - Loading animation
   - Analysis results (skills, experience level, recommended roles)
   - "Explore Job Matches" button

If this works → **Everything is working!** ✅

---

## STEP 10: Verify Complete Workflow

Try this full workflow:

1. ✅ Login with test@gmail.com
2. ✅ Upload a resume
3. ✅ See resume analysis results
4. ✅ Click "Explore Job Matches"
5. ✅ See job list with match scores
6. ✅ Try filtering jobs
7. ✅ Go to "My Applications" (should be empty)

If all steps work → **Your app is fully deployed!** 🎉

---

## ⚠️ Troubleshooting

### Problem: Backend shows as "Failed to build"

**Solution:**
1. Click service
2. Go to **Logs** tab
3. Look for the error message
4. Usually caused by missing `GEMINI_API_KEY`
5. Add it and click **Redeploy**

### Problem: Frontend shows "Can't reach API"

**Solution:**
1. Check `VITE_API_URL` environment variable
2. Must be your actual backend URL
3. Click service → Settings → Environment
4. Update it and redeploy

### Problem: Services still "Building" after 20 minutes

**Solution:**
1. Check Logs for errors
2. If stuck, click **"Redeploy"** button
3. Or restart the service

### Problem: "Connection refused" error

**Solution:**
1. Both services must be "Live" (not "Building")
2. Wait a bit more for them to fully start
3. Try refreshing the page

### Problem: Resume upload fails

**Solution:**
1. Check backend logs for errors
2. Verify `GEMINI_API_KEY` is correct
3. Check internet connection
4. Try with a different file

---

## 📊 Your Deployment Summary

| Service | Type | URL | Status |
|---------|------|-----|--------|
| Backend | Web Service | `https://ai-job-tracker-backend.onrender.com` | Live ✅ |
| Frontend | Web Service | `https://ai-job-tracker-frontend.onrender.com` | Live ✅ |
| Health Check | API Endpoint | `/health` | Working ✅ |

---

## 🔄 Making Updates After Deployment

**To update your app:**

1. Make code changes on your computer
2. Commit changes:
   ```bash
   git add .
   git commit -m "Your message"
   ```
3. Push to GitHub:
   ```bash
   git push origin main
   ```
4. Render automatically redeploys! (2-5 minutes)

---

## 📞 Quick Help

| Issue | Check |
|-------|-------|
| Can't see login page | Is frontend URL correct? Test in incognito mode |
| Can't login | Is backend service "Live"? Check logs |
| Resume upload stuck | Is it > 10MB? Try smaller file |
| No job matches | Did resume analysis work? Upload different resume |
| API errors | Check both services are "Live" |

---

## ✅ Success Checklist

- [ ] GitHub repo created and code pushed
- [ ] Render blueprint deployment created
- [ ] `GEMINI_API_KEY` added to backend
- [ ] Both services show "Live" status
- [ ] Backend health check works (`/health`)
- [ ] Frontend page loads
- [ ] Can login with test@gmail.com
- [ ] Resume upload works
- [ ] Job list displays with match scores
- [ ] Can filter and view job details

**If all checked → Your app is live! Deploy successful!** 🎉

---

## 🎯 Next Steps (Optional)

After deployment works:

1. **Custom domain** (Render → Service → Settings → Custom Domain)
2. **Email notifications** (optional feature)
3. **Database** (if you want persistent data)
4. **Monitoring** (Render provides basic logs)
5. **Scaling** (upgrade from free tier if needed)

---

**Questions?** Check the detailed guides:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full technical guide
- [RENDER_QUICK_START.md](RENDER_QUICK_START.md) - Quick reference

**You're ready to deploy! Let's go!** 🚀
