# PRD — MLP-3: LinkedIn History Visualization & Strategy

**Status:** Later (7d) | **Cost:** $0-2 | **Depends:** MLP-2b

## 1. Problem
Creators don't know if posting frequency matters; LinkedIn native analytics is poor; they can't see `what if I posted 3×/week with Crafter`.

## 2. Goal
Import past 3-month LinkedIn posts → visualize frequency & engagement → project future with Crafter.

## 3. User Stories
- US1 I upload LinkedIn data export CSV (or connect LinkedIn to fetch last 20 posts) → see bar chart posts/week
- US2 I see engagement (likes/comments) line over time
- US3 I see dashed projection: `if 3×/week with Crafter, you'd hit ~X posts, +Y% reach`
- US4 I can filter by hashtag/type to see what works

## 4. Functional Requirements
- RF1 Import: CSV upload (LinkedIn → Settings → Get data → Posts) parsed client-side → `linkedin_posts (user_id, posted_at, content, likes, comments, url)`; fallback API fetch via `GET /api/linkedin/history` (calls `ugcPosts` with pagination, needs `r_member_social`)
- RF2 Paid option: Proxycurl/BrightData `$2/200` for users without export — gated behind `Pay $2 to import` button (Stripe not needed yet, manual)
- RF3 Charts: Recharts — Bar (posts/week), Line (engagement), Dashed projection (simple: avg engagement * projected posts)
- RF4 Storage: Supabase `linkedin_posts`, RLS per user
- RF5 Telemetry: `history_import, viz_view, projection_click`

## 5. Acceptance Criteria
- [ ] CSV with 50 posts imports <2s, shows correct dates
- [ ] API fetch returns ≤20 posts without CSV
- [ ] Chart shows 12 weeks (3 months) correctly, empty weeks as 0
- [ ] Projection toggles and updates with frequency slider
- [ ] No import → shows `Upload to see your chart` empty state

## 6. Out of Scope
- AI content suggestions from history, team analytics

## 7. Metrics
- Import rate >10% of signed-in users
- Viz view duration >30s
- Conversion to schedule from viz >20%

## 8. Tech
- `recharts`, `papaparse` for CSV, Supabase `linkedin_posts`

## 9. Timeline
Day1-2: CSV import + table
Day3-4: Charts + projection
Day5: Polish + empty states
