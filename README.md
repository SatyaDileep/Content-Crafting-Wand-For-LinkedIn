# Content Crafter — Wand for LinkedIn ✨

**Stop guessing what your LinkedIn post will look like. See it, polish it, ship it — 100% private, 100% free.**

> I was tired of paying $39/mo for a text formatter that wanted my LinkedIn password. So I built the tool I actually wanted — and open-sourced it.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn) [![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](#license) [![100% Client-Side](https://img.shields.io/badge/client--side-100%25-blue)](#the-privacy-promise) [![No Tracking](https://img.shields.io/badge/tracking-zero-lightgrey)](#telemetry-privacy-friendly) [![LinkedIn Ready](https://img.shields.io/badge/LinkedIn-Share%20%7C%20Post-blue)](#-linkedin-share--telemetry)

---

## The Problem — LinkedIn Makes You Fly Blind

1. **The 210-char cliff** — your hook vanishes behind `…see more` if the first 3 lines don't grab. You never know where the cut is until you've posted.
2. **Formatting is stripped** — LinkedIn kills Markdown. `**bold**`, bullets, italics? Gone unless you know the Unicode hack.
3. **No true preview** — not for feed posts, not for document PDFs. You hit Publish and *hope*.
4. **AI is paywalled** — every "LinkedIn AI writer" wants a subscription before you type one word.
5. **Document posts are a gamble** — upload a 10-page PDF and pray the carousel looks right.

**Content Crafter fixes all five. Free, open-source, and your words never leave your browser unless you opt into sync.**

---

## Why I Built This

I'm a Product Manager who posts on LinkedIn to build in public. I tried Taplio, Typefully, Buffer — great products, but I didn't want a subscription for formatting text, and I didn't want to hand over my LinkedIn account.

I needed one private place where I could **write → see the real feed cut → format with Unicode that survives paste → design a card or visualize my PDF → copy and post.** No servers, no tracking, no account.

So I built it for myself. Then I realized everyone needs this. So I shipped it free and open source.

---

## What It Does — Three Studios, One Flow

### 🔍 Feed Preview — See Exactly What Your Network Will See
- Pixel-accurate LinkedIn feed mockup (560px) with realistic `…see more / Show less` at ~210 chars
- **Copy for LinkedIn** + **↗ Post to LinkedIn** sit beside preview where your eye already is — one click copies Unicode or opens LinkedIn share intent
- Header shows `Private • No tracking • No signup` — corporate, honest

### 🎨 Image Card Studio — One Container, Not Three
- Single glassmorphic panel with `✎ Compose | 🎨 Style` tabs
  - **Compose:** eyebrow + big title + pull quote + post body (AiBar + toolbar live here)
  - **Style:** width slider (300–700px), text color, **20 curated gradients** — 3 corporate (navy/slate/white) + 17 creator themes, dotted export canvas
- **Export:** `html-to-image` at 2× retina → `linkedin-post.png` (Google Fonts fallback), `Copy caption` + `Post to LinkedIn` inside panel

### 📄 Document Visualizer — The Differentiator
- Drop images (PNG/JPG/WebP) or PDF → `pdfjs-dist` renders swipeable tiles (max 10 slides, 6MB/file)
- Caption + tiles together as LinkedIn renders a document post — pure visualization, no competing export

### 🤖 AI That Respects Your Voice (and Your Wallet)
**BYO key. Stays in `localStorage`. Sent directly to Gemini / Groq / any OpenAI-compatible endpoint. We never see it.**
- Provider-aware: `✓ Gemini AI Active` header badge, switch provider/model in Settings
- Four actions: `✨ Improve` (modal with 6 presets + freeform → custom prompt), `😊 Add Emojis` (6–10, never in hashtags, never truncates), `💼 Pro`, `🏷️ Hashtags` (5–7 tags appended, not replaced)
- Prompt hygiene + `normalizePost` post-processing so AI never bloats preview
- Card AI: `✨ Thought` + `🤖 Title` with glass global loader (`Gemini is working — editing is paused` + shimmer)

### ✍️ Editor — The Bridge
- `**bold** → 𝐛𝐨𝐥𝐝`, `*italic → 𝑖𝑡𝑎𝑙𝑖𝑐*`, `~~strike~~`, bullets → Unicode that survives paste
- Toolbar: `𝐁 Bold | 𝐼 Italic | S̶ Strike | • Bullet | → Arrow | # Tag | 😊 👉 ✨` → telemetry tracks every emoji click
- Tabs: `✎ Post | 👤 Profile` inside editor — profile updates feed preview live, nothing uploaded

### 🔗 LinkedIn Share + Telemetry
- **Share:** `shareOnLinkedIn(unicode)` opens `linkedin.com/feed/?shareActive=true&text=...` — if `VITE_LINKEDIN_CLIENT_ID` set, header shows `Connect LinkedIn` → OAuth → `POST /api/linkedin/post` for true publish; otherwise intent fallback
- **Telemetry (privacy-friendly):** `src/lib/telemetry.ts` tracks `copy_preview, copy_caption, emoji_click, ai_click/success/error, export_png, linkedin_share` via `sendBeacon` to `VITE_TELEMETRY_URL=/api/telemetry`. Respects DNT, no PII, `VITE_TELEMETRY_ENABLED=0` disables. Logs to Vercel/Netlify functions for `DAU, posted, AI refine` metrics

---

## The Privacy Promise

| We do | We don't |
|---|---|
| Run 100% in browser (MLP-1) | Run a backend for content (unless you opt into sync) |
| Store AI keys in `localStorage` only | Send content to any server |
| Call *your* provider directly | Track PII or sell data |
| Optional anonymized telemetry (event only) | Require an account to use |
| Open source — audit it |  |

> Keys never leave this browser. Content never leaves this browser (telemetry is event counts only, DNT respected).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + glassmorphism, subtle corporate blobs |
| Fonts | Inter + Source Serif 4 |
| PNG Export | `html-to-image` (2× retina, `skipFonts` fallback) |
| PDF Preview | `pdfjs-dist` (worker lazy) |
| AI | Gemini 3.6 Flash/Pro, Groq (Llama 3.3/3.1), any OpenAI-compatible base URL |
| LinkedIn | OAuth 2.0 (`VITE_LINKEDIN_CLIENT_ID`) + share intent fallback, `/api/linkedin/*` (Vercel) |
| Telemetry | `src/lib/telemetry.ts` → `POST /api/telemetry` (sendBeacon), Vercel/Netlify logs |
| Future Sync | Supabase (Postgres + Auth + RLS) — see `docs/MLP_ROADMAP.md` |
| Quality | `oxlint` + `tsc -b` |

---

## Quick Start

```bash
git clone https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn.git
cd Content-Crafting-Wand-For-LinkedIn
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/
npm run preview  # preview build
npm run lint     # oxlint
```

### Enable AI (30s)
1. App → **Settings** (top-right)
2. Pick provider: **Gemini** ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)) · **Groq** ([console.groq.com/keys](https://console.groq.com/keys)) · **Custom** (OpenRouter/Together/local)
3. Paste key + model → header `✓ Gemini AI Active`

### Optional — LinkedIn + Telemetry
```env
# .env
VITE_LINKEDIN_CLIENT_ID=your-linkedin-client-id
VITE_TELEMETRY_URL=/api/telemetry
VITE_TELEMETRY_ENABLED=1
# Server (Vercel dashboard):
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
RESEND_API_KEY=... # for MLP-2a email reminders
```

---

## Deploy — Free Forever

**Vercel (recommended):** Push to GitHub → vercel.com → Add Project → import repo → Build `npm run build`, Output `dist` (`vercel.json` handles SPA + `/api/*`) → Deploy. Set env vars in dashboard.

**Netlify:** Fork → Add site → Import → `npm run build` → `dist` → Deploy (`netlify.toml` preconfigured).

Also: Cloudflare Pages, GitHub Pages (static only, `/api` needs Vercel/Netlify).

---

## Roadmap — MLP

| Phase | Scope | Store | Status |
|-------|-------|-------|--------|
| **MLP-1 ✅** | Studio + preview + Unicode + 20 themes + BYO AI + LinkedIn intent + telemetry | localStorage | Shipped |
| **MLP-2a** | Drafts + Calendar + Email reminder (local, no auto-publish) | localStorage | Next — [PRD](docs/PRD_MLP-2a_Drafts-Calendar.md) |
| **MLP-2b** | Cross-device sync + Google Sign-In + cron auto-publish | Supabase | After 2a — [PRD](docs/PRD_MLP-2b_Sync-Cron.md) |
| **MLP-3** | 3-month history CSV import + frequency viz + projection | Supabase | Later — [PRD](docs/PRD_MLP-3_Visualization.md) |

Full architecture + timeline → [docs/MLP_ROADMAP.md](docs/MLP_ROADMAP.md)

---

## Telemetry — What We Measure

Anonymized, DNT-respected: `copy_preview, copy_caption, emoji_click, ai_click, ai_success, ai_error, export_png_success, linkedin_share_click, linkedin_share_intent`. See `src/lib/telemetry.ts`. Disable with `VITE_TELEMETRY_ENABLED=0`. Server logs at `/api/telemetry` (Vercel logs → metrics).

---

## An Initiative By

**Satya Dileep Kumar Thotakura** — Product Manager @ Pegasystems · Hyderabad — obsessed with great products, great taste.

Private by design — your content never leaves your browser · MIT Open Source

- LinkedIn: [satya-dileep-kumar-thotakura-9b25021b](https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/) · Portfolio: [satyadileep.github.io](https://satyadileep.github.io)

---

## Contributing

PRs welcome. Keep it surgical and private-by-default.

```bash
npm run lint
npm run build   # must pass before push
```

Don't commit `.env` or keys. See [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

[MIT](LICENSE) — use it, ship it, brag about it.

*Built in public by [Satya Dileep](https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/) — #ContentCrafter #BuildInPublic*
