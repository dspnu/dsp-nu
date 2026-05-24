
# Career Hub — Plan

Transforms the standalone Jobs board into a full **Career Hub** at `/career`. Each user gets **1 AI credit per week (resets every Monday 00:00 local server time, UTC)**. Credits power AI-driven career tools backed by Lovable AI Gateway.

## User-facing surface

New nav item **Career** (Briefcase icon) replaces the implicit Jobs entry. Page is a tabbed hub:

```
/career
 ├─ Overview          credit balance, weekly reset countdown, recent activity, "what's new"
 ├─ Resume Review     paste/upload resume → AI feedback + rewrite suggestions
 ├─ LinkedIn          paste profile text or sections → optimization recommendations
 ├─ Personal Brand    short intake (goals, audience) → brand statement + bio variants
 ├─ Outreach          recruiter/alumni cold message generator (role, contact, ask)
 ├─ Interview Prep    role + JD → tailored questions, STAR answer drafts
 ├─ Job Strategy      goals + timeline → 30/60/90 plan, target company list prompts
 └─ Jobs Board        existing job posts (merged from /jobs)
```

Each AI tool follows the same pattern:
1. Intake form (textareas, dropdowns)
2. "Run" button shows credit cost (1) and remaining balance
3. Streaming AI output rendered as markdown
4. Past runs saved to history (per tool, per user) for re-reading without spending a credit

## Credit system

- **Allocation**: 1 credit/week, fixed Monday reset (UTC). Unused credits do **not** roll over.
- **Storage**: `career_credit_usage` table — one row per spend with `user_id`, `tool`, `week_start` (date, the Monday), `created_at`.
- **Balance check**: A user has a credit if no row exists for them with `week_start = current_monday`. Server computes this in the edge function.
- **Override**: Admins/Officers can grant bonus credits via `career_credit_grants` (used before consuming weekly allocation).

## AI tools backend

Single edge function `career-ai` with action discriminator:
- Body: `{ tool: 'resume_review' | 'linkedin' | 'personal_brand' | 'outreach' | 'interview_prep' | 'job_strategy', input: {...} }`
- Validates JWT, checks credit balance, picks tool-specific system prompt, streams response from Lovable AI Gateway (`google/gemini-3-flash-preview` default; `google/gemini-2.5-pro` for resume review since it benefits from larger context).
- On successful stream start, inserts `career_credit_usage` row.
- Saves final output to `career_ai_runs` (user_id, tool, input jsonb, output text, created_at) after stream completes (client posts back, or we capture server-side — simpler: client persists after stream ends via separate insert protected by RLS).

Handles 402/429 with friendly toast messages.

## Data model (new tables)

| Table | Purpose | Key columns |
|---|---|---|
| `career_credit_usage` | Tracks weekly credit spends | user_id, tool, week_start, created_at |
| `career_credit_grants` | Admin-issued bonus credits | user_id, amount, granted_by, reason, expires_at |
| `career_ai_runs` | History of past AI outputs | user_id, tool, input jsonb, output text, created_at |

RLS:
- `career_credit_usage`: user reads own; insert via edge function (service role).
- `career_credit_grants`: admin/officer manage; user reads own.
- `career_ai_runs`: user reads/deletes own; insert via edge function or own user.

## Navigation & file structure

```
src/features/career/
 ├─ pages/CareerHubPage.tsx           tabbed shell
 ├─ components/
 │   ├─ CreditBalanceCard.tsx         shows X/1 credit, reset countdown
 │   ├─ AIToolShell.tsx               reusable intake + run + output + history
 │   ├─ ResumeReviewTool.tsx
 │   ├─ LinkedInTool.tsx
 │   ├─ PersonalBrandTool.tsx
 │   ├─ OutreachTool.tsx
 │   ├─ InterviewPrepTool.tsx
 │   ├─ JobStrategyTool.tsx
 │   └─ CareerActivityFeed.tsx        recent runs across tools
 ├─ hooks/
 │   ├─ useCareerCredits.ts           current balance + reset date
 │   ├─ useCareerAIRun.ts             streaming caller for edge function
 │   └─ useCareerHistory.ts           list past runs per tool
 └─ lib/streamCareerAI.ts             SSE parser

src/features/jobs/                    UNCHANGED, embedded as a tab
supabase/functions/career-ai/index.ts
```

`config/featureRegistrations.ts`: replace the implicit jobs nav with a single `career` feature (Briefcase icon, path `/career`).

## Out of scope for v1

- File-upload resume parsing (PDF/DOCX). v1 = paste text. PDF parsing can be added later via a separate edge function.
- Resume version history beyond raw run logs.
- Cron job for credit reset — none needed because we derive balance from current week's Monday.
- Recruiter contact CRM.

## Technical notes

- Lovable AI Gateway streamed via SSE; we already use this pattern (per chat/AI guidelines).
- Default model `google/gemini-3-flash-preview`; resume + interview prep optionally `openai/gpt-5-mini` (still cheap, better structure) — finalized during implementation.
- All credit checks happen server-side in the edge function; client UI is informational only.
- Migration order: tables + RLS → edge function → frontend.

## Build order (single PR)

1. Migration: 3 new tables, RLS, indexes.
2. Edge function `career-ai` with all 6 tool prompts + streaming + credit gate.
3. Frontend: feature scaffold, hooks, shared `AIToolShell`, 6 tool components.
4. Nav: register `career` feature, route, mobile + desktop nav entry; merge jobs board as last tab.
5. Update memory index with new Career Hub entry.
