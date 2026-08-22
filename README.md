# Content Crafter — Wand for LinkedIn ✨

Beautiful, open-source LinkedIn post studio. Craft posts that stop the scroll, preview exactly as they appear in the feed, and copy Unicode formatting that actually works on LinkedIn.

**Live:** Deploy to Netlify in 30s → [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

Inspired by [LinkedInPreview.com](https://linkedinpreview.com/) + [Dynamic Card Generator](https://satyadileep.github.io/apps/linkedin-card.html) — rebuilt as a modern, brag-worthy OSS app.

## ✨ Features

### 1. Realistic Feed Mockup (Photo-like Visualizer)
- Editable profile header (avatar, name, headline, LinkedIn URL)
- **"...see more" truncation inspector** — highlights the 210-char fold so your hook lands before collapse
- **Mobile / Desktop toggle** + Dark mode
- Engagement bar (Like / Comment / Repost / Send) + reaction counts

### 2. Unicode Formatter & Copier
- **Markdown → Unicode** engine: `**bold**` → `𝗯𝗼𝗹𝗱`, `*italic*` → `𝘪𝘵𝘢𝘭𝘪𝘤`, `•` bullets, `→` arrows
- Inline toolbar (Bold, Italic, Bullet, Emoji)
- Live chars / words / lines + **One-click "Copy for LinkedIn"**

### 3. Image Card Export
- Gradient themes (Midnight, Sunset, Ocean...)
- Thought highlight, card width control
- **Export PNG** via `html-to-image` (2x retina)

## 🚀 Quick Start

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
npm run preview
```

## 🌐 Deploy to Netlify

1. Fork this repo
2. Netlify → **New site from Git** → pick repo
3. Build command: `npm run build` , Publish dir: `dist`
4. Done. Or click the button above.

`netlify.toml` is preconfigured with SPA redirect.

## 🧠 Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** + Inter / Source Serif fonts
- **html-to-image** for PNG export
- 100% client-side — no backend, no keys, privacy-first

## 📖 How to Use

1. Write in the editor using `**bold**`, `*italic*`, `- bullet`
2. Watch the **Feed Preview** — ensure your hook is above the fold (amber highlight)
3. Switch to **Formatter** → **Copy for LinkedIn** → paste directly into LinkedIn
4. Or go to **Image Card** → pick gradient → **Download PNG**

## 🤝 Contributing

PRs welcome! See `CONTRIBUTING.md`. Run `npm run lint` before pushing.

## 📄 License

MIT — brag freely, ship faster.
