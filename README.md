# AI Resume Analyzer + Interview Coach

Production-ready Next.js App Router project for resume analysis, ATS scoring, interview generation, mock interviews, and Sarvam-powered voice mode.

## 1. Folder Structure

```text
app/
  (marketing)/        Public landing page
  (auth)/             Login and signup routes
  (app)/              Protected dashboard area
  api/                Route handlers for auth, resumes, interviews, profile, and voice
components/
  auth/               Login and signup UI
  dashboard/          Analytics and recent activity widgets
  forms/              Resume upload and interview generator forms
  history/            History view with delete actions
  interview/          Mock interview chat and voice controls
  layout/             Protected shell and navigation
  profile/            Settings form
  ui/                 ShadCN-style reusable UI primitives
hooks/
  use-file-upload.ts  File validation and upload state
  use-voice-interview.ts Voice recording helper
lib/
  auth/               NextAuth options and session helpers
  api.ts              API response helpers
  db.ts               MongoDB connection cache
  env.ts              Environment variable validation
  validations.ts      Zod schemas for all inputs
models/
  User.ts
  Resume.ts
  ResumeAnalysis.ts
  InterviewSet.ts
  InterviewSession.ts
  UserPreferences.ts
services/
  openai.service.ts        OpenAI prompts and JSON parsing
  resume-parser.service.ts PDF and DOCX parsing
  sarvam.service.ts        Speech-to-text and text-to-speech
  dashboard.service.ts     Dashboard, history, and profile aggregation
types/
  interview.ts        Interview DTOs
  next-auth.d.ts      Session and JWT augmentation
  profile.ts          Preferences DTOs
  resume.ts           Resume and dashboard DTOs
utils/
  cn.ts               Class merging helper
  date.ts             Date formatting helpers
  file.ts             File validation and text cleanup
  format.ts           Score and text helpers
```

## 2. Install Commands

```bash
npm install
npm run dev
```

Core packages in this project:

- `next-auth`
- `mongoose`
- `tailwindcss`
- `@radix-ui/react-*` + `class-variance-authority` + `clsx` + `tailwind-merge` for ShadCN-style UI
- `axios`
- `pdf-parse`
- `mammoth`
- `react-dropzone`
- `react-hook-form`
- `sonner`
- `lucide-react`

## 3. Database Setup

MongoDB connection lives in [lib/db.ts](/d:/resume_checker/resumexpt/lib/db.ts). Schemas live in [models](/d:/resume_checker/resumexpt/models) and all related collections use `userId` for ownership and query scoping.

Models included:

- `User`
- `Resume`
- `ResumeAnalysis`
- `InterviewSet`
- `InterviewSession`
- `UserPreferences`

## 4. Auth Setup

NextAuth credentials auth is configured in [lib/auth/options.ts](/d:/resume_checker/resumexpt/lib/auth/options.ts).

Included:

- Signup route with password hashing
- Credentials login
- JWT session strategy
- Protected route proxy in [proxy.ts](/d:/resume_checker/resumexpt/proxy.ts)
- `SessionProvider` in [components/providers.tsx](/d:/resume_checker/resumexpt/components/providers.tsx)

## 5. Services

- OpenAI service: [services/openai.service.ts](/d:/resume_checker/resumexpt/services/openai.service.ts)
- Resume parser: [services/resume-parser.service.ts](/d:/resume_checker/resumexpt/services/resume-parser.service.ts)
- Sarvam voice service: [services/sarvam.service.ts](/d:/resume_checker/resumexpt/services/sarvam.service.ts)
- Dashboard aggregation: [services/dashboard.service.ts](/d:/resume_checker/resumexpt/services/dashboard.service.ts)

## 6. API Routes

Main server endpoints:

- `/api/auth/[...nextauth]`
- `/api/auth/signup`
- `/api/dashboard`
- `/api/resumes`
- `/api/resumes/[id]`
- `/api/resumes/[id]/analyze`
- `/api/interviews`
- `/api/interviews/[id]`
- `/api/interviews/sessions`
- `/api/interviews/sessions/[id]`
- `/api/interviews/sessions/[id]/message`
- `/api/history`
- `/api/profile`
- `/api/voice/stt`
- `/api/voice/tts`

## 7. Pages

Public routes:

- `/`
- `/login`
- `/signup`

Protected routes:

- `/dashboard`
- `/upload`
- `/analysis/[id]`
- `/interviews`
- `/interviews/[id]`
- `/history`
- `/profile`

## 8. Components

The UI includes:

- Hero landing page
- Sidebar app shell
- Analytics cards
- Resume upload drag-and-drop
- ATS analysis score view with badges and progress bar
- Interview generator form
- Mock interview chat with voice toggle
- History archive
- Profile settings
- Skeleton loaders and toast notifications

## 9. Final Integration

Environment variables are validated in [lib/env.ts](/d:/resume_checker/resumexpt/lib/env.ts). Local values are stored in `.env.local`, while `.env.example` provides the deployment template.

Run the full verification suite:

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

Deploy to Vercel with the same environment variables from `.env.local` configured in the Vercel dashboard:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GEMINI_API_KEY` or `OPENAI_FALLBACK_ENABLED=true` with `OPENAI_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SARVAM_API_KEY` and related `SARVAM_*` values only if you want voice mode or Sarvam fallback support

Suggested flow:

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add the environment variables in Vercel Project Settings.
4. Trigger the first deployment.
5. Update `NEXTAUTH_URL` to the production domain after deploy.

## Verification Status

Verified locally:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
