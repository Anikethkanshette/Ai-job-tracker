# AI-Powered Job Tracker

A production-grade job tracking application with AI-powered job matching and intelligent assistant features.

## Features

- **AI Job Matching**: Semantic matching using LangChain and Gemini embeddings
- **Smart Apply Tracking**: Automatic application status tracking
- **AI Assistant**: Natural language job search and filter control using LangGraph
- **Resume Analysis**: PDF/TXT resume upload with text extraction
- **Advanced Filtering**: 7 comprehensive filters (role, skills, date, type, mode, location, match score)
- **Application Management**: Track application status through the hiring pipeline

## Tech Stack

### Frontend
- React 18 with Vite
- Tailwind CSS for styling
- React Router v6 for navigation
- Zustand for state management
- Axios for API calls

### Backend
- Node.js with Fastify
- LangChain for AI job matching
- LangGraph for AI assistant orchestration
- Gemini API for embeddings and LLM
- In-memory storage (JSON)

## Prerequisites

- Node.js 18+ and npm
- Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Setup Instructions

### 1. Clone and Install

```bash
# Navigate to project directory
cd "c:\Users\Admin\Downloads\New folder"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env` file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your Gemini API key:

```
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

### 5. Login

Use the demo credentials:
- Email: `test@gmail.com`
- Password: `test@123`

## Project Structure

```
├── backend/
│   ├── routes/           # API endpoints
│   │   ├── auth.js       # Authentication
│   │   ├── resume.js     # Resume upload
│   │   ├── jobs.js       # Job listings & matching
│   │   ├── applications.js # Application tracking
│   │   └── assistant.js  # AI assistant
│   ├── services/
│   │   ├── langchain-matcher.js    # LangChain job matching
│   │   ├── langgraph-assistant.js  # LangGraph AI assistant
│   │   └── job-mock-data.js        # Mock job dataset
│   ├── utils/
│   │   └── pdf-extractor.js        # PDF text extraction
│   └── server.js         # Fastify server
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # Route pages
│   │   │   ├── Login.jsx
│   │   │   ├── ResumeUpload.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Applications.jsx
│   │   ├── components/   # Reusable components
│   │   │   ├── JobCard.jsx
│   │   │   ├── MatchBadge.jsx
│   │   │   ├── FilterPanel.jsx
│   │   │   ├── SmartApplyModal.jsx
│   │   │   └── AIAssistant.jsx
│   │   ├── store/        # Zustand stores
│   │   │   ├── useAuthStore.js
│   │   │   ├── useFilterStore.js  # CENTRAL FILTER STATE
│   │   │   └── useJobStore.js
│   │   ├── services/
│   │   │   └── api.js    # Axios instance
│   │   └── App.jsx       # Main app component
│   └── vite.config.js
│
└── docs/
    ├── ARCHITECTURE.md
    ├── LANGCHAIN_IMPLEMENTATION.md
    ├── LANGGRAPH_IMPLEMENTATION.md
    └── TRADEOFFS.md
```

## Usage Guide

### 1. Upload Resume
After login, you'll be prompted to upload your resume (PDF or TXT). This is required for AI matching.

### 2. Browse Jobs
The dashboard shows:
- **Best Matches**: Top 6-8 jobs based on your resume
- **All Jobs**: Complete job listing with filters

### 3. Use Filters
Apply filters manually via the sidebar or ask the AI assistant:
- "Show only remote jobs"
- "High match score only"
- "Full-time jobs in San Francisco"

### 4. AI Assistant
Click the chat bubble (bottom-right) to:
- Search jobs naturally: "Find me Python developer roles"
- Control filters: "Show remote jobs with high match"
- Get help: "Where are my applications?"

### 5. Apply to Jobs
Click "Apply Now" → Opens job link in new tab → Return to see "Did you apply?" modal → Track application status

### 6. Manage Applications
Navigate to "My Applications" to:
- View all applications
- Filter by status
- Update application status (Applied → Interview → Offer/Rejected)
- View timeline

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify token

### Resume
- `POST /api/resume/upload` - Upload resume (multipart/form-data)
- `GET /api/resume` - Get resume info
- `DELETE /api/resume` - Delete resume

### Jobs
- `GET /api/jobs` - Get all jobs (with filters)
- `GET /api/jobs/:id/match` - Get match score for specific job
- `POST /api/jobs/match-all` - Batch match all jobs

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - Get user's applications
- `PATCH /api/applications/:id` - Update application status

### AI Assistant
- `POST /api/assistant/chat` - Chat with AI assistant
- `GET /api/assistant/history` - Get conversation history
- `DELETE /api/assistant/history` - Clear history

## Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-restart on file changes
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot module replacement
```

### Build for Production
```bash
# Frontend
cd frontend
npm run build
npm run preview

# Backend
cd backend
npm start
```

## Troubleshooting

### "Failed to fetch jobs" or AI errors
- Check that your Gemini API key is correctly set in `backend/.env`
- Verify the API key is valid and has quota remaining

### "Unauthorized" errors
- Clear browser localStorage and login again
- Check that backend server is running on port 3000

### Resume upload fails
- Ensure file is PDF or TXT format
- Check file size is under 10MB
- Verify backend `/uploads` directory exists

### AI Assistant not updating filters
- Check browser console for errors
- Verify `window.filterStore` is accessible in console
- Ensure frontend and backend are both running

## License

MIT

## Support

For issues or questions, please check the documentation in the `docs/` directory.
