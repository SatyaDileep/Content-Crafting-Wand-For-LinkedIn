# Content Crafter — Wand for LinkedIn ✨

Beautiful, open-source LinkedIn post studio. Craft posts that stop the scroll, preview exactly as they appear in the feed, and copy Unicode formatting that actually works on LinkedIn.

> Your posts stay on your device. Nothing leaves your browser. MIT licensed.

## ✨ Features

### 1. Feed Preview
- Editable profile header (avatar, name, headline, LinkedIn URL)
- **"...see more" truncation inspector** — highlights the 210-char fold so your hook lands before collapse
- **Mobile / Tablet / Desktop toggle** + Dark mode (auto-detects system preference)
- Engagement bar (Like / Comment / Repost / Send) + reaction counts
- **Markdown rendering** — see bold, italic, strikethrough, and bullet lists exactly as LinkedIn renders them

### 2. Unicode Formatter & Copier
- **Markdown → Unicode** engine: `**bold**` → `𝗯𝗼𝗹𝗱`, `*italic*` → `𝘪𝘵𝘢𝘭𝘪𝘤`, `~~strike~~` → `s̶t̶r̶i̶k̶e̶`, `•` bullets, `→` arrows
- Inline toolbar (Bold, Italic, Strikethrough, Bullets, Emojis)
- Live chars / words / lines stats + **One-click "Copy for LinkedIn"**

### 3. Image Card Export
- **17 gradient themes** from deep indigo to coral sunset
- macOS-style card header with traffic-light dots
- Glass-effect header/footer with subtle transparency
- Card width slider (300–700px) + Text color picker
- Markdown rendering in card content + highlighted thought
- **AI-powered** "Generate Thought" and "Auto-Generate Title & Header" via Gemini
- **Export PNG** via `html-to-image` (2x retina)

## 🚀 Quick Start

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
npm run preview
```

## 🌐 Deploy

1. Fork this repo
2. Any static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages
3. Build command: `npm run build` , Publish dir: `dist`
4. Done.

## 🧠 Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** + Inter / Source Serif fonts
- **html-to-image** for PNG export
- **Gemini AI** (BYO API key) — optional, privacy-first
- 100% client-side — no backend, no tracking, your data stays on your device

## 📖 How to Use

1. Write in the editor using `**bold**`, `*italic*`, `~~strike~~`, `- bullet`
2. Watch the **Feed Preview** — ensure your hook is above the fold (amber highlight)
3. Switch to **Formatter** → **Copy for LinkedIn** → paste directly into LinkedIn
4. Or go to **Image Card** → pick a gradient → **Download PNG**

## 🤝 Contributing

PRs welcome! Run `npm run lint` before pushing.

## 📄 License

MIT — brag freely, ship faster.
