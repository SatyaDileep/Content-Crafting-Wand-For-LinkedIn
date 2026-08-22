# Content Crafter — Wand for LinkedIn ✨

**The open-source LinkedIn post studio that respects your privacy.**

Most LinkedIn tools lock your best ideas behind a paywall. Content Crafter is different — it's free, it's open source, and your content never leaves your browser. Write posts that stop the scroll, preview exactly how they'll appear in the feed, and export beautiful cards that make your brand shine.

> *"I built this because I was tired of paying for tools that just format text."*

---

## Why This Exists

LinkedIn is the world's professional stage. But crafting a great post is harder than it should be:

- **The 210-char fold** — your hook disappears behind "...see more" if you don't nail the opening. Most people don't even know where the cutoff is.
- **No formatting support** — LinkedIn strips Markdown. Bold, italic, strikethrough? Gone. Unless you know the Unicode trick.
- **No preview** — you paste your post, hit publish, and *hope* it looks right. By then it's too late.
- **AI tools are paywalled** — every "LinkedIn AI assistant" wants your credit card before you can even try it.

Content Crafter solves all four — for free, forever, with zero tracking.

---

## What It Does

### 📱 Feed Preview — See Before You Post
Write your post and watch it appear in a **pixel-perfect LinkedIn feed mockup**. Toggle between mobile, tablet, and desktop. The **210-character fold inspector** highlights exactly where LinkedIn will truncate your post, so your hook always lands before the collapse.

### ✍️ Rich Text Formatter — Formatting That Survives Paste
Type in Markdown (`**bold**`, `*italic*`, `~~strikethrough~~`). Content Crafter converts it to **Unicode Mathematical Sans-Serif** — formatting that LinkedIn actually keeps when you paste. One click, done.

### 🎨 Image Card Export — Branded Visuals in Seconds
Choose from **17 curated gradient themes**, add a highlighted thought, customize width and colors, then **export a retina-quality PNG** — perfect for carousel posts, standalone announcements, or sharing on other platforms.

### 🤖 AI Writing Assistant — Your Ghostwriter, Your Key
Optional Gemini AI integration (BYO API key — free tier works). Improve your draft, add emojis, shift tone to professional, or auto-generate a full post from an idea. **Your API key stays in your browser.** We never see it.

---

## The Privacy Promise

| What We Do | What We Don't |
|---|---|
| Run entirely in your browser | Send data to any server |
| Store your API key in localStorage only | Store anything on our end |
| Use your own Gemini key for AI | Run a backend or database |
| Open source — audit the code yourself | Track you with analytics |

**Your content is yours.** Period.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn.git
cd Content-Crafting-Wand-For-LinkedIn
npm install

# Start developing
npm run dev     # → http://localhost:5173

# Production build
npm run build   # → dist/
npm run preview # preview the build locally
```

### Optional: Enable AI Features

1. Get a free Gemini API key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Open the app → Settings → paste your key
3. Done. The AI buttons in the editor and card tabs now work.

> Your key is stored in your browser's `localStorage` and sent directly to Google. It never touches our servers.

### Optional: Google Sign-In

Set `VITE_GOOGLE_CLIENT_ID` in your `.env` to enable optional Google Sign-In for AI consent. Works without it — just paste your API key.

---

## Deploy to Netlify (or anywhere)

**One-click:**
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

**Manual (30 seconds):**
1. Fork this repo on GitHub
2. Netlify → **Add new site** → **Import from Git**
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy. Done.

Also works on Vercel, Cloudflare Pages, GitHub Pages, or any static host. The `netlify.toml` is preconfigured with SPA redirects.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Fonts | Inter + Source Serif 4 |
| PNG Export | html-to-image (2x retina) |
| AI | Google Gemini (BYO key, free tier) |
| Auth | Google OAuth (optional) |

**Zero backend. Zero tracking. 100% client-side.**

---

## How It Helps Content Creators

| Problem | Solution |
|---|---|
| "Will my hook survive the fold?" | **Feed Preview** highlights the 210-char cutoff in real time |
| "My formatting gets stripped on LinkedIn" | **Unicode Formatter** converts Markdown to paste-safe formatting |
| "I need a branded image but can't design" | **Image Card Export** with 17 themes and one-click PNG download |
| "I stare at a blank post for 30 minutes" | **AI Assistant** generates, improves, and polishes your drafts |
| "I don't want to pay $20/mo for this" | **Free forever.** MIT licensed. No account needed. |
| "I'm worried about my data" | **Privacy-first.** Nothing leaves your browser. Audit the code. |

---

## Contributing

PRs welcome! This project is MIT-licensed — fork it, remix it, make it yours.

```bash
npm run lint     # oxlint
npm run build    # verify before pushing
```

---

## License

MIT — use it, ship it, brag about it.

---

*Built by [Satya Dileep Kumar Thotakura](https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/) · #ContentCrafter*
