# System Architecture

## Overview

The AI-Powered Job Tracker is built as a client-server application with clear separation between frontend (React) and backend (Node.js/Fastify). The system uses AI for intelligent job matching and conversational assistance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │    Stores    │      │
│  │  - Login     │  │  - JobCard   │  │  - Auth      │      │
│  │  - Dashboard │  │  - Filters   │  │  - Filters ★ │      │
│  │  - Apps      │  │  - AI Chat   │  │  - Jobs      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                          │                                   │
│                          │ Axios API Client                  │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ HTTP/REST
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                    │
│                   Fastify Server                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes                               │   │
│  │  /auth  /resume  /jobs  /applications  /assistant    │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│  ┌──────────────────────┼────────────────────────────────┐  │
│  │                      ▼                                 │  │
│  │              Core Services                             │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐  │  │
│  │  │   LangChain      │  │     LangGraph            │  │  │
│  │  │  Job Matcher     │  │   AI Assistant           │  │  │
│  │  │                  │  │                          │  │  │
│  │  │  - Embeddings    │  │  - Intent Detection      │  │  │
│  │  │  - Similarity    │  │  - Filter Parsing        │  │  │
│  │  │  - Explanation   │  │  - Job Search            │  │  │
│  │  └──────────────────┘  │  - Help System           │  │  │
│  │           │             └──────────────────────────┘  │  │
│  │           │                        │                  │  │
│  │           └────────────┬───────────┘                  │  │
│  │                        ▼                              │  │
│  │                 Gemini API                            │  │
│  │          (Embeddings + LLM)                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              In-Memory Storage                         │  │
│  │  - Users & Sessions                                    │  │
│  │  - Resumes                                             │  │
│  │  - Applications                                        │  │
│  │  - Conversation History                                │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

★ = Exposed globally for AI assistant access
```

## Component Interaction Flow

### 1. Authentication Flow
```
User → Login Page → POST /api/auth/login → Session Token
     → Store token in localStorage (Zustand persist)
     → Redirect based on resume status
```

### 2. Resume Upload Flow
```
User → Upload PDF/TXT → POST /api/resume/upload
     → Extract text (pdf-parse)
     → Store resume text in memory
     → Update user.hasResume = true
     → Redirect to Dashboard
```

### 3. Job Matching Flow
```
Dashboard Load → POST /api/jobs/match-all
              → For each job:
                  - Get resume embedding (Gemini)
                  - Get job embedding (Gemini)
                  - Calculate cosine similarity
                  - Generate explanation (LLM)
              → Return jobs with match scores
              → Display with color-coded badges
```

### 4. AI Assistant Filter Control Flow
```
User: "Show only remote jobs"
  ↓
POST /api/assistant/chat
  ↓
LangGraph State Graph:
  1. Intent Detection → "filter_update"
  2. Filter Parsing → {workMode: "remote"}
  3. Response Generation
  ↓
Frontend receives filterUpdates
  ↓
window.filterStore.updateFilters({workMode: "remote"})
  ↓
UI filters update automatically
  ↓
Job list re-renders with filter applied
```

### 5. Smart Apply Flow
```
User clicks "Apply" → window.open(job.applyUrl)
                   → Set timeout (2 seconds)
                   → Show SmartApplyModal
                   → User selects status
                   → POST /api/applications
                   → Application tracked
```

## State Management Strategy

### Frontend State (Zustand)

**1. Auth Store** (`useAuthStore`)
- User session and authentication
- Token management
- Persisted to localStorage

**2. Filter Store** (`useFilterStore`) ★ CRITICAL
- **Centralized filter state**
- Exposed globally as `window.filterStore`
- AI assistant calls `updateFilters()` directly
- Reactive: UI updates automatically

**3. Job Store** (`useJobStore`)
- Job listings with match scores
- Application tracking
- Best matches computation

### Backend State (In-Memory)

**1. Sessions Map**
- Key: token → Value: {userId, email, createdAt}

**2. Users Map**
- Key: userId → Value: {id, email, hasResume, resume}

**3. Applications Map**
- Key: applicationId → Value: {jobId, status, timeline}

**4. Conversation Histories Map**
- Key: userId → Value: [{role, content, timestamp}]

## Data Flow

### Request Flow
```
React Component
  ↓
Zustand Action
  ↓
Axios API Call (with auth interceptor)
  ↓
Fastify Route Handler
  ↓
Service Layer (LangChain/LangGraph)
  ↓
Gemini API (if needed)
  ↓
Response back through chain
  ↓
Zustand State Update
  ↓
React Re-render
```

### Filter Update Flow (AI-Controlled)
```
AI Assistant Chat
  ↓
LangGraph Filter Parser
  ↓
Return filterUpdates in response
  ↓
Frontend: window.filterStore.updateFilters(filterUpdates)
  ↓
Zustand triggers subscribers
  ↓
Dashboard re-applies filters
  ↓
Filtered job list updates
```

## Key Design Decisions

### 1. Centralized Filter State
- **Why**: AI assistant needs direct access to update filters
- **How**: Zustand store exposed on `window` object
- **Benefit**: Single source of truth, reactive updates

### 2. In-Memory Storage
- **Why**: Simplicity for demo/evaluation
- **Trade-off**: Data lost on restart
- **Future**: Easy to swap for database (same interface)

### 3. LangChain for Matching
- **Why**: Semantic understanding beyond keywords
- **How**: Embeddings + cosine similarity
- **Benefit**: Better matches than simple keyword search

### 4. LangGraph for Assistant
- **Why**: Complex multi-step reasoning
- **How**: State graph with conditional routing
- **Benefit**: Maintainable, extensible conversation logic

### 5. Smart Apply Detection
- **Why**: Reduce manual data entry
- **How**: Browser visibility API + timeout
- **Trade-off**: May not work perfectly in all browsers

## Security Considerations

### Current Implementation (Demo)
- Fixed credentials (not production-ready)
- In-memory sessions (no persistence)
- No password hashing
- No rate limiting

### Production Recommendations
1. Use proper authentication (OAuth, JWT)
2. Hash passwords (bcrypt)
3. Implement rate limiting
4. Add CSRF protection
5. Use HTTPS
6. Validate all inputs
7. Sanitize file uploads

## Scalability Considerations

### Current Limitations
- In-memory storage (single instance)
- No caching for AI responses
- Synchronous job matching

### Scaling Strategy
1. **Database**: PostgreSQL for persistence
2. **Caching**: Redis for embeddings and match scores
3. **Queue**: Bull/BullMQ for async job matching
4. **CDN**: Static assets on CDN
5. **Load Balancer**: Multiple backend instances
6. **Monitoring**: Logging and error tracking

## Technology Choices Rationale

### Frontend
- **React**: Component reusability, ecosystem
- **Vite**: Fast dev server, modern build tool
- **Tailwind**: Rapid UI development, consistency
- **Zustand**: Lightweight, simple API
- **React Router**: Standard routing solution

### Backend
- **Fastify**: Fast, low overhead, good plugin system
- **LangChain**: AI framework with Gemini integration
- **LangGraph**: State machine for complex AI flows
- **pdf-parse**: Reliable PDF text extraction
- **In-memory**: Simplicity for demo

## Future Enhancements

1. **Real-time Updates**: WebSocket for live job postings
2. **Email Notifications**: Application status updates
3. **Calendar Integration**: Interview scheduling
4. **Resume Builder**: AI-assisted resume creation
5. **Job Recommendations**: Proactive suggestions
6. **Analytics Dashboard**: Application success metrics
7. **Multi-user Support**: Team collaboration features
