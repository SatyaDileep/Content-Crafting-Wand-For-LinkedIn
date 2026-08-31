# Contributing to Content Crafter — Wand for LinkedIn

Thanks for wanting to contribute! This project is **100% client-side and privacy-first by design**. That shapes everything we accept.

## Ground Rules

- **Stay client-side.** No servers, no databases, no analytics, no tracking. If a feature needs a backend, it needs a very good argument first.
- **Keys and content never leave the browser.** Any AI work must go through the user's own provider key from `localStorage`.
- **Surgical changes.** Prefer small, focused diffs. Don't rewrite files you don't need to.
- **No `.env` or secrets** in commits. Ever.

## Getting Started

```bash
git clone https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn.git
cd Content-Crafting-Wand-For-LinkedIn
npm install
npm run dev    # http://localhost:5173
```

## Project Layout

```
src/
  App.tsx                 # main layout, editor, profile, state, export
  components/
    AiBar.tsx             # AI actions + improve modal + global loader trigger
    Carousel.tsx          # Document visualizer (caption + PDF tiles)
    SettingsModal.tsx     # provider/key/model + optional Google auth
  lib/
    gemini.ts             # prompts + provider calls (Gemini/Groq/OpenAI)
    unicode.ts            # markdown -> LinkedIn-safe Unicode
    auth.tsx              # auth + key state (localStorage)
```

## Making Changes

1. Branch off `main`: `git checkout -b feat/your-change`
2. Implement your change (surgical, please).
3. **Verify before pushing:**
   ```bash
   npm run lint
   npm run build
   ```
   Both must pass. The build runs `tsc -b` so type errors fail the build too.
4. Commit with a focused message describing the *why*.
5. Open a PR against `main`.

## AI Prompt Hygiene

If you touch prompts in `src/lib/gemini.ts`:

- Prefer **deterministic post-processing** (`normalizePost` in `AiBar.tsx`) over relying on the model to follow formatting rules.
- Keep the `STRICT FORMATTING` contract: 3–5 paragraphs, one blank line between paragraphs, tight bullets, hashtags on one line.
- Test that generated text doesn't bloat the feed preview.

## Style Guide

- TypeScript + React 19 + Tailwind v4. Match surrounding conventions.
- `npm run lint` enforces via oxlint.
- Keep components in `src/components`, logic in `src/lib`.

## Good First Issues

Look for issues tagged `good first issue`. Anything marked "surgical" is a great entry point.

## Questions

Open a GitHub issue or reach out via the LinkedIn profile in the README footer.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).
