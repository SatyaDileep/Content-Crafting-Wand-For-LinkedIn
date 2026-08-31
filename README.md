# Content Crafter — Wand for LinkedIn ✨

**Stop guessing what your LinkedIn post will look like. See it, polish it, ship it — 100% private.**

> I was tired of paying $39/mo for a text formatter that wanted my LinkedIn password. So I built the tool I actually wanted — and open-sourced it.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn) [![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](#license) [![100% Client-Side](https://img.shields.io/badge/client--side-100%25-blue)](#the-privacy-promise) [![No Tracking](https://img.shields.io/badge/tracking-zero-lightgrey)](#the-privacy-promise)

---

## The Problem — LinkedIn Makes You Fly Blind

LinkedIn is the world's professional stage, but writing for it is needlessly painful:

1. **The 210-char cliff** — your hook vanishes behind `…see more` if the first 3 lines don't grab. You never know where the cut is until you've already posted.
2. **Formatting is stripped** — LinkedIn kills Markdown. `**bold**`, bullets, italics? Gone unless you know the Unicode hack.
3. **No true preview** — not for feed posts, not for document PDFs. You hit Publish and *hope*.
4. **AI is paywalled** — every "LinkedIn AI writer" wants a subscription before you type one word.
5. **Document posts are a gamble** — upload a 10-page PDF and pray the carousel looks right.

**Content Crafter fixes all five. Free, open-source, and your words never leave your browser.**

---

## Why I Built This

I'm a Product Manager who posts on LinkedIn to build in public. I tried Taplio, Typefully, Buffer — great products, but I didn't want a subscription for formatting text, and I definitely didn't want to hand over my LinkedIn account.

I needed one private place where I could **write → see the real feed cut → format with Unicode that survives paste → design a card or visualize my PDF → copy and post.** No servers, no tracking, no account.

So I built it for myself. Then I realized everyone needs this. So I shipped it free and open source. If it helps one creator post with confidence, it was worth it.

---

## What It Does — Three Studios, One Flow

### 🔍 Feed Preview — See Exactly What Your Network Will See

- Pixel-accurate LinkedIn feed mockup (desktop `560px` — where 90% of decisions happen)
- **Intuitive fold** — subtle `…see more / Show less` at ~210 chars. No noisy badges, no clutter. Your hook is either above the fold or it isn't — you know instantly.
- **Copy for LinkedIn right beside the preview** — `⎘ Copy for LinkedIn` sits next to `…see more` where your eye already is. One click copies LinkedIn-safe Unicode (see below).

### 🎨 Image Card Studio — One Container, Not Three

The journey: compose a visual post, download a crisp PNG, paste its caption on LinkedIn. More intuitive than "write then attach" for many creators.

- **Single glassmorphic panel** with `✎ Compose | 🎨 Style` tabs — not two floating containers
  - **Compose:** eyebrow + big title + pull quote + full post body (AiBar + toolbar live here when in card mode)
  - **Style:** width slider (300–700px), text color, 17 curated gradients (indigo-deep to burnt-orange)
- **Export canvas:** dotted design surface so you *feel* it's exportable, macOS chrome, `html-to-image` at 2× retina → `linkedin-post.png`
- **Actions where they belong:** `⬇ Download PNG` + `Copy caption` live inside the same panel — preview on the right is pure preview, no duplicate buttons

### 📄 Document Visualizer — The Differentiator

Nobody shows you how caption + PDF look together. We do — because that's how LinkedIn renders a document post.

- Drop **images (PNG/JPG/WebP) or a PDF** — PDF pages are rendered via `pdfjs-dist` into swipeable tiles
- **Limits that protect you:** max **10 slides**, **6 MB per file**, type whitelisting with friendly inline errors
- **Post + tiles together:** your live caption on top, two small tiles below (`112×148`) with `‹ ›` to swipe, `✕` on hover to remove — no giant frame inside the post, no second 10-tile grid. Just how LinkedIn shows *caption + document*.
- **Pure visualization:** no export PDF button. You uploaded your PDF to *see* it — we don't compete with your original. Intuitive, minimal, honest.

### 🤖 AI That Respects Your Voice (and Your Wallet)

**BYO key. Your key stays in `localStorage`. Sent directly to Gemini / Groq / any OpenAI-compatible endpoint. We never see it.**

- **Provider-aware:** `✓ Gemini AI Active` in the header tells you who's working. Switch provider + model in Settings anytime.
- **Four purposeful actions** (Auto-Generate removed — it was noisy):
  - `✨ Improve` → opens a **modal**: 6 presets ("Stronger hook", "Fix grammar", "Make concise", etc.) + freeform input → custom prompt that targets *that* intent
  - `😊 Add Emojis` → 6–10 emojis, hook + sprinkled, never in hashtags — and **never truncates** your post
  - `💼 Pro` → crisp executive tone
  - `🏷️ Hashtags` → 5–7 tags on **one line**, appended to your post (never replaces it), broad + niche mix for reach
- **Prompt hygiene:** strict `STRICT FORMATTING` blocks (3–5 paragraphs, one blank line between paragraphs, tight bullets) + deterministic **post-processing** (`normalizePost` — collapses `3+` newlines, tightens `• ` gaps, caps paragraphs) so AI never bloats your preview
- **Card AI too:** `✨ Thought` (pull quote) + `🤖 Title` inside Image Card, with spinner + `Working…`
- **Glassmorphic global loader:** every LLM call dims the whole UI (`bg-white/30 + backdrop-blur-[6px]`) with a frosted `Gemini is working — editing is paused` card + shimmer bar. No typing, no confusion, completely intuitive.

### ✍️ Editor — The Bridge

- Markdown-aware: `**bold** → 𝐛𝐨𝐥𝐝`, `*italic → 𝑖𝑡𝑎𝑙𝑖𝑐*`, `~~strike~~`, `•` bullets → Unicode that survives paste
- Toolbar: `𝐁 Bold | 𝐼 Italic | S̶ Strike | • Bullet | → Arrow | # Tag | 😊 👉 ✨`
- AiBar always visible with provider dot + color
- Two-way tabs inside the same glass container: `✎ Post | 👤 Profile` — profile (name, headline, avatar URL, LinkedIn URL) lives *inside* the editor, not as a separate card. What you see in Feed & Document previews updates instantly. Nothing uploaded.

---

## The Privacy Promise

| We do | We don't |
|---|---|
| Run 100% in your browser | Run a backend or database |
| Store AI keys in `localStorage` only | Send your content to any server |
| Call *your* provider directly | Track, log, or sell anything |
| Open source — audit it yourself | Require an account |

> Keys never leave this browser. Content never leaves this browser.

---

## Tech Stack — Zero Backend

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + glassmorphism (`backdrop-blur-xl`, ambient blobs) |
| Fonts | Inter + Source Serif 4 |
| PNG Export | `html-to-image` (2× retina, Google Fonts fallback with `skipFonts`) |
| PDF Preview | `pdfjs-dist` (worker lazy-loaded) |
| AI | Gemini 3.6 Flash/Pro, Groq (Llama 3.3/3.1, Gemma, Mixtral), or any OpenAI-compatible base URL |
| Auth | Google OAuth (optional, via `VITE_GOOGLE_CLIENT_ID`) |
| Quality | `oxlint` + `tsc -b` |

Everything is static. Host it anywhere.

---

## Quick Start

```bash
git clone https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn.git
cd Content-Crafting-Wand-For-LinkedIn
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/
npm run preview  # preview the build
npm run lint     # oxlint
```

### Enable AI (optional, 30 seconds)

1. App → **Settings** (top-right)
2. Pick provider: **Gemini** ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)) · **Groq** ([console.groq.com/keys](https://console.groq.com/keys)) · **Custom** (OpenRouter / Together / local LLM base URL)
3. Paste key + model → header flips to `✓ Gemini AI Active` → all AI buttons work

Google Sign-In is optional — set `VITE_GOOGLE_CLIENT_ID` in `.env` if you want it. AI works fine without.

---

## Deploy — Free Forever

**It's static. No functions, no DB, no cost.**

**Vercel (recommended, Hobby free):**
1. Push to GitHub
2. [vercel.com](https://vercel.com) → Add New → Project → import repo
3. Build: `npm run build`, Output: `dist` (auto-detected), `vercel.json` handles SPA rewrite → Deploy

**Netlify:** Fork → Add new site → Import → `npm run build` → `dist` → Deploy (one-click button at top works too). `netlify.toml` is preconfigured.

**Also:** Cloudflare Pages, GitHub Pages, any static host.

---

## Why Open Source?

1. **Trust is the feature.** You can audit exactly what happens to your content and keys.
2. **LinkedIn tools shouldn't be rent.** Formatting and preview are table stakes — they should be free.
3. **Build in public = better product.** Every commit, every fold tweak, every prompt fix is public. You shape it.
4. **Remix friendly.** MIT — fork it for your team, your brand, your language.

If this helped you post, star it and share your first post made with Content Crafter. That's the best thanks.

---

## Roadmap

- [x] Fold-aware feed preview + Unicode formatter
- [x] Image Card (17 themes, PNG export)
- [x] Document visualizer (caption + PDF)
- [x] BYO-key AI (Gemini/Groq/OpenAI) with modal Improve & glass loader
- [ ] More card layouts (quote, stats, list)
- [ ] Scheduling hints (best times to post)
- [ ] Carousel builder (export multi-slide PDF)
- [ ] Your idea? Open an issue / PR.

---

## Contributing

PRs welcome. Keep it surgical and private-by-default.

```bash
npm run lint
npm run build   # must pass before push
```

Please don't commit `.env` or keys. Read the full [Contributing Guide](CONTRIBUTING.md) and please respect our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

Released under the [MIT License](LICENSE) — use it, ship it, brag about it.

---

*Built in public by [Satya Dileep Kumar Thotakura](https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/) — Product Manager @ Pegasystems · #ContentCrafter #BuildInPublic*

---

*Built in public by [Satya Dileep Kumar Thotakura](https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/) — Product Manager @ Pegasystems · #ContentCrafter #BuildInPublic*
