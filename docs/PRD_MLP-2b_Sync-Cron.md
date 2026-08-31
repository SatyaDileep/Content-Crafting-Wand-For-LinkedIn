# PRD — MLP-2b: Cross-Device Sync + True Scheduled Publish

**Status:** After 2a traction (2-3w) | **Cost:** $0 free tier | **Depends:** MLP-2a

## 1. Problem
Local drafts die on mobile/incognito; manual reminder still requires copy-paste; power users want true `post at 9am`.

## 2. Goal
Optional Google Sign-In → drafts sync everywhere + cron auto-publishes to LinkedIn at scheduled time.

## 3. User Stories
- US1 As signed-in user, my drafts appear on phone and laptop instantly
- US2 I schedule post for Tuesday 9am → it auto-publishes to LinkedIn without me opening app
- US3 I see sync status (synced/offline) and can disconnect LinkedIn
- US4 If publish fails (token expired), I get email + draft stays scheduled with error

## 4. Functional Requirements
- RF1 Auth: Google OAuth via Supabase Auth (reuse `VITE_GOOGLE_CLIENT_ID`), RLS: users see own drafts only
- RF2 Supabase tables: `drafts` (see MLP_ROADMAP SQL), `linkedin_tokens (user_id, access_token, refresh_token, expires_at)`
- RF3 Sync: on login, migrate localStorage drafts → Supabase; realtime subscribe via `supabase.channel`
- RF4 Cron: `vercel.json crons: /api/linkedin/schedule every 5min` → query `where status='scheduled' and scheduled_at <= now()` → call LinkedIn `ugcPosts` → update `posted_at`, track `linkedin_post_api_success/error`
- RF5 Token refresh: before publish, if expires <5min, refresh via `https://www.linkedin.com/oauth/v2/accessToken?grant_type=refresh_token`
- RF6 Disconnect: revoke token, clear `linkedin_tokens`

## 5. Acceptance Criteria
- [ ] Anonymous flow still works (no regression)
- [ ] Login migrates 100% of local drafts without duplicate
- [ ] Draft edited on desktop appears on mobile <3s
- [ ] Scheduled post publishes within 5min window, appears on LinkedIn
- [ ] Failed publish sends email and keeps draft scheduled
- [ ] RLS: user A cannot read user B drafts (test with 2 accounts)

## 6. Out of Scope
- Team workspaces, bulk CSV, analytics viz

## 7. Metrics
- Sync adoption: >20% of DAU sign in
- Schedule-to-publish success >95%
- Cross-device DAU lift +15%

## 8. Tech
- `src/lib/supabase.ts`, Supabase Auth, Postgres RLS, Vercel Cron, Resend

## 9. Timeline
Week1: Supabase project + auth + drafts sync
Week2: Cron publish + token refresh + error handling
