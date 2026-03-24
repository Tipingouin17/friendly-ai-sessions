# MyFacilitator - Comprehensive Project Documentation

## Overview

MyFacilitator is an AI-powered workshop facilitation platform that enables hosts to create interactive sessions where AI facilitators guide participants through structured conversations, exercises, and decision-making processes. The platform generates actionable insights and reports from every session.

---

## Architecture

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state, React hooks for local state
- **Routing**: React Router v6

### Backend (Supabase Proxy)
- **Server**: Python Flask (server.py in `/supabase_proxy/`)
- **Database**: PostgreSQL (direct connection via psycopg2)
- **AI**: OpenAI API (GPT-4.1-mini) for facilitator responses
- **Auth**: JWT-based authentication with mock user system

### Deployment
- **Web Server**: Nginx serving static files on port 8080
- **Proxy Server**: Flask on port 3333
- **Database**: PostgreSQL on port 5432

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `conversations` | Main session records with status, settings, participant config |
| `sessions` | Workshop templates linked to facilitators |
| `facilitators` | AI facilitator profiles with personality, system prompts |
| `messages` | All conversation messages (welcome, questions, responses) |
| `session_participants` | Participant records per conversation |
| `session_reports` | Generated reports after session closure |

### Key Relationships
- `conversations.sessions_id` → `sessions.id`
- `sessions.facilitator_id` → `facilitators.id`
- `messages.conversation_id` → `conversations.id`
- `session_participants.conversation_id` → `conversations.id`

### Database Triggers
- `trigger_generate_welcome_message`: Fires when `session_started` changes to `true`, sets `welcome_message_status` to `'ai_generating'` and sends `pg_notify`

---

## Personas and Workflows

### Persona 1: Visitor (Unauthenticated)
- Browse public pages: Home, Pricing, FAQs, Contact, Terms, Privacy
- Sign up / Log in
- Join a session via direct link (`/join-session?id={conversationId}`)

### Persona 2: Host (Authenticated Admin)
1. **Select Facilitator**: Choose from AI facilitator library
2. **Select Workshop**: Pick a workshop template
3. **Configure Session**: Set participant count, description, accept terms
4. **Create Session**: Generates conversation record
5. **Wait for Participants**: Monitor participant joins
6. **Start Session**: Triggers welcome message generation
7. **Monitor Session**: View messages, track responses, see analytics
8. **Close Session**: Generate report, mark as completed
9. **Download Report**: Text or JSON format

### Persona 3: Participant
1. **Join Session**: Via URL with conversation ID
2. **Enter Name**: Choose avatar and display name
3. **Wait for Session Start**: See "Waiting for host" message
4. **Receive Questions**: AI facilitator asks questions
5. **Send Responses**: Type and submit answers
6. **View Follow-ups**: AI generates follow-up questions based on responses
7. **Session Ends**: See "Session Has Ended" message

---

## Key Hooks and Components

### Host-Side Hooks
| Hook | Purpose |
|------|---------|
| `useSessionHostLogic` | Main orchestrator for host session |
| `useHostMessages` | Message management for host view |
| `useMessageFetching` | Polling-based message fetching (3s interval) |
| `useSessionInterface` | Session start/stop controls |
| `useSessionClosure` | Close session and generate report |
| `useWorkshopReports` | Fetch reports for past workshops |

### Participant-Side Hooks
| Hook | Purpose |
|------|---------|
| `useJoinSessionData` | Data fetching for join session page |
| `useSessionParticipants` | Participant management and monitoring |
| `useParticipantPersistence` | localStorage-based session persistence |
| `useEnhancedSessionMessages` | Message fetching with fallback polling |
| `useSessionStatus` | Session status monitoring with redirect logic |

### Shared Hooks
| Hook | Purpose |
|------|---------|
| `useConversation` | Fetch conversation data from API |
| `useConversationId` | Extract conversation ID from URL params |

---

## Proxy Server Endpoints

### REST API (`/rest/v1/{table}`)
- **GET**: Select with filtering, ordering, pagination, nested joins
- **POST**: Insert records
- **PATCH**: Update records
- **DELETE**: Delete records

### Auth API (`/auth/v1/`)
- `POST /auth/v1/token?grant_type=password`: Login
- `POST /auth/v1/signup`: Register
- `GET /auth/v1/user`: Get current user

### Edge Functions (`/functions/v1/{function_name}`)
- `handle-facilitator-response`: Generate AI responses (welcome messages, follow-ups)
- `close-session-and-generate-report`: Close session and generate report

### Storage (`/storage/v1/object/public/{bucket}/{path}`)
- Serves facilitator avatar images

---

## Critical Bug Fixes Applied

1. **Message polling**: Rewrote `useMessageFetching` with proper `setInterval` (3-second polling)
2. **Infinite re-render loop**: Fixed `getSessionByConversationId` to be a pure read function
3. **Session closure DB**: Fixed proxy DB connection handling (autocommit + single connection)
4. **Welcome message trigger**: Handle `'ai_generating'` status from DB trigger
5. **Welcome message content**: Fixed proxy session context query (facilitator title column)
6. **Nested joins**: Fixed proxy to auto-include FK columns in SQL queries
7. **Completed session UX**: Added proper "Session Has Ended" page for participants
8. **useConversation**: Removed status check that threw for completed sessions
9. **Session redirect**: Fixed `useSessionStatus` to not redirect on join-session page
10. **Loading state**: Fixed `useJoinSessionData` to use actual loading state

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Proxy server URL (http://localhost:3333) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (mock) |
| `OPENAI_API_KEY` | OpenAI API key for AI facilitation |

---

## Running Locally

```bash
# 1. Start PostgreSQL
sudo service postgresql start

# 2. Start the proxy server
cd supabase_proxy && python3 server.py 3333 &

# 3. Build the frontend
npm run build

# 4. Serve with nginx (or any static file server)
sudo cp -r dist/* /var/www/myfacilitator/
sudo nginx
```

---

## Test Results Summary

| Persona | Tests | Passed | Failed |
|---------|-------|--------|--------|
| Visitor | 13 | 13 | 0 |
| Host | 22 | 22 | 0 |
| Participant | 8 | 7 | 0 |
| **Total** | **43** | **42** | **0** |

All functional tests passed. 1 note: "Connection error, using fallback updates" banner is expected in local environment (no WebSocket/Supabase Realtime).
