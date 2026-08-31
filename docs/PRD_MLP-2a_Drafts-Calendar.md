# PRD — MLP-2a: Drafts + Calendar (Local-Only)

**Status:** Next (3-5d) | **Cost:** $0 | **Branch:** `feat/mlp-2-drafts-calendar`

## 1. Problem
Users lose drafts when switching device/incognito; LinkedIn has no calendar view for scheduled posts; they forget to post.

## 2. Goal
Validate retention with zero backend. Let users `save → schedule → see calendar → get reminded → post manually`. Prove they schedule >3 posts before we invest in cloud.

## 3. Users
- Primary: Solo creator writing 2-4×/week on desktop Chrome
- Secondary: Mobile drafter wanting to see drafts later (will feel pain → validates 2b)

## 4. User Stories
- US1 As creator, I save current editor content as Draft with title auto from first line
- US2 I see list of drafts (draft/scheduled/posted) with search + counters
- US3 I pick date+time to schedule draft → dot appears on calendar
- US4 At scheduled time -5min I get email + browser notification "Ready to post → Copy"
- US5 I mark draft as Posted after copying → moves to Posted column
- US6 AI history per draft (which improve/emojis used) persists

## 5. Functional Requirements
- RF1 Draft CRUD: `id, content, unicode, status, scheduledAt, postedAt, createdAt, ai_meta[], gradient, cardTitle, cardHeader`
- RF2 Store: localStorage `cc_drafts` (JSON array), max 50 drafts, no auth
- RF3 Calendar: month view (custom grid, no lib), dots for scheduled, click day filters list, drag to reschedule
- RF4 Reminder: `POST /api/remind` (Vercel Cron every 5min checks local? Actually client-side: on load check due drafts → if due and not notified, call `/api/remind` with email from optional input). Free Resend 100/d or EmailJS fallback. Browser Notification API as primary.
- RF5 Counters: header `Drafts: 3 | Scheduled: 2 | Posted: 4`
- RF6 Telemetry: `draft_save, draft_delete, schedule_save, schedule_reminder_sent, calendar_click, draft_posted`

## 6. Acceptance Criteria
- [ ] Can create draft from editor in <2 clicks, appears in list instantly
- [ ] Calendar renders all scheduled drafts, correct timezone
- [ ] Reminder email arrives within 5min of scheduled time (test with 2min future)
- [ ] Posted drafts not re-reminded
- [ ] Refresh retains all drafts (localStorage)
- [ ] Mobile responsive: list + calendar stack

## 7. Out of Scope
- Cross-device sync, auto LinkedIn publish, Google login, history import

## 8. Metrics (success)
- >30% of DAU save ≥1 draft
- >15% schedule ≥1 post
- Reminder click-through >40%

## 9. Tech
- React state + localStorage, `date-fns` for dates, `Recharts` not needed yet, Resend via `/api/remind.ts`

## 10. Timeline
Day1: Draft store + list UI
Day2: Calendar grid + schedule picker
Day3: Reminder email + notification + Posted flow
Day4: Polish + telemetry
