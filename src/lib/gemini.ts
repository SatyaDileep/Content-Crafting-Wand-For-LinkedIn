export type GeminiAction = "improve" | "emojis" | "professional" | "hashtags" | "generateThought" | "generateTitleHeader" | "hook" | "defluff" | "extractQuote"

export type AIProviderType = "gemini" | "groq" | "openai" | "anthropic" | "openrouter"

export const GEMINI_MODELS = [
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (fast, recommended)" },
  { id: "gemini-3.6-pro", label: "Gemini 3.6 Pro (best quality)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (legacy)" },
] as const

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (versatile)" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (instant)" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
] as const

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"

export const DEFAULT_OPENAI_BASE = "https://api.openai.com/v1"

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openai: "Custom (OpenAI-compatible)",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
}

const PROMPTS: Record<GeminiAction, (text: string)=>string> = {
  improve: t => `You are a LinkedIn ghostwriter. Sharpen this post: stronger hook in the first 2 lines, clearer value, human voice. Keep under 180 words and keep markdown **bold** where it helps.\n\nSTRICT FORMATTING — follow exactly:\n- 3 to 5 paragraphs max. ONE blank line between paragraphs. NEVER a blank line between sentences in the same paragraph.\n- Bullet items starting with "• " stay tight — NO blank lines between bullets.\n- Hashtags (if any) on ONE line at the very end. No trailing blank lines.\n- Return ONLY the post, nothing else.\n\nPost:\n\n${t}`,
  emojis: t => `Add emojis to this LinkedIn post. Insert 6-10 relevant emojis total — one in the hook, 1-2 per paragraph, lightly inside bullet lines. Do NOT add emojis inside hashtags. PRESERVE every word/sentence — do NOT truncate, shorten or drop trailing lines/hashtags.\n\nSTRICT FORMATTING:\n- Keep exact paragraph count. ONE blank line between paragraphs, NO extra blank lines anywhere.\n- Bullet lines ("• ") stay consecutive with NO blank lines between them.\n- Do NOT add line breaks inside a paragraph.\n- Keep markdown **bold**. Return ONLY the full post with emojis, complete and uncut.\n\nPost:\n\n${t}`,
  professional: t => `Rewrite this LinkedIn post in a crisp, professional executive tone that still sounds human. Keep markdown **bold**.\n\nSTRICT FORMATTING:\n- 3 to 5 paragraphs max. ONE blank line between paragraphs. No blank line between sentences in same paragraph.\n- Bullet items ("• ") tight, no blank lines between bullets.\n- No trailing blank lines. Return ONLY the post.\n\nPost:\n\n${t}`,
  hashtags: t => `You are a LinkedIn growth expert. For the post below, recommend 5-7 high-impression hashtags that best match its topic to boost discovery. Mix 2-3 broad, high-volume tags with 3-4 niche, lower-competition ones. IMPORTANT: Return ONLY the hashtags on ONE single line, space-separated (e.g. "#AI #ProductManagement #BuildInPublic #Leadership"), no numbering, no bullets, no newlines, no extra commentary:\n\n${t}`,
  generateThought: t => `Based on the following LinkedIn post content, generate a short, insightful, and concise "highlighted thought" that stands out as a pull quote. Maximum 3 lines. Include 1-2 relevant emojis. Return ONLY the thought text, nothing else:\n\n${t}`,
  generateTitleHeader: t => `Based on the following post content, generate a short catchy card title and a concise series header (like "AI-Byte Series #Day24"). Format the response EXACTLY as: Title | Header. Return nothing else:\n\n${t}`,
  hook: t => `Generate 5 distinct LinkedIn hook opening lines, each strictly under 140 characters. Use curiosity, contrarian viewpoint, or concrete data. Number 1-5, each on its own line, no extra commentary. Post context:\n\n${t}`,
  defluff: t => `De-fluff and format scannable: restructure dense paragraphs into clean 1-2 sentence lines optimized for readability. Keep markdown **bold** on keys. Return ONLY the post:\n\n${t}`,
  extractQuote: t => `Extract the central takeaway into one punchy sentence suitable for an Image Card. Return ONLY that sentence:\n\n${t}`,
}

export function buildCustomImprovePrompt(text: string, instruction: string): string {
  const instr = instruction.trim() || "Sharpen this post for LinkedIn"
  return `You are a LinkedIn ghostwriter. User wants: "${instr}". Apply that to the post below. Keep markdown **bold** and bullets. Keep under 180 words.\n\nSTRICT FORMATTING:\n- 3 to 5 paragraphs max. ONE blank line between paragraphs. NEVER blank line between sentences in same paragraph.\n- Bullet items ("• ") tight — NO blank lines between bullets. No trailing blank lines. Return ONLY the post.\n\nPost:\n\n${text}`
}

async function generateWithGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ temperature:0.7, maxOutputTokens: 1800 } })
  })
  if(!res.ok){
    let detail = ""
    try { const j = await res.json(); detail = JSON.stringify(j?.error || j).slice(0,400) } catch { detail = await res.text().catch(()=>"") }
    throw new Error(`Gemini ${res.status}: ${detail}`)
  }
  const data = await res.json()
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if(!out) throw new Error("Empty response from Gemini")
  return out.trim()
}

async function generateWithAnthropic(prompt: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: model || "claude-3-5-sonnet-20241022", max_tokens: 1800, messages: [{ role: "user", content: prompt }] }),
  })
  if (!res.ok) {
    let detail = ""
    try { const j = await res.json(); detail = JSON.stringify(j?.error || j).slice(0, 400) } catch { detail = await res.text().catch(() => "") }
    throw new Error(`Anthropic ${res.status}: ${detail}`)
  }
  const data = await res.json()
  const out = data?.content?.[0]?.text
  if (!out) throw new Error("Empty response from Anthropic")
  return out.trim()
}

// Groq and any OpenAI-compatible endpoint share the chat/completions shape.
async function generateWithOpenAI(prompt: string, apiKey: string, model: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/,"")}/chat/completions`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1800,
    })
  })
  if(!res.ok){
    let detail = ""
    try { const j = await res.json(); detail = JSON.stringify(j?.error || j).slice(0,400) } catch { detail = await res.text().catch(()=>"") }
    throw new Error(`${res.status}: ${detail}`)
  }
  const data = await res.json()
  const out = data?.choices?.[0]?.message?.content
  if(!out) throw new Error("Empty response from model")
  return out.trim()
}

export type AIResult = { text: string; source: AIProviderType }

export type AISettings = {
  provider: AIProviderType
  apiKey: string
  model: string
  baseUrl?: string
}

/**
 * Calls whichever provider the user configured. Gemini uses its own REST shape;
 * Groq and any OpenAI-compatible endpoint use the chat/completions shape.
 */
export async function callAI(action: GeminiAction, text: string, settings: AISettings): Promise<AIResult> {
  const prompt = PROMPTS[action](text)
  return callAIWithPrompt(prompt, settings)
}

export async function callAIWithPrompt(prompt: string, settings: AISettings): Promise<AIResult> {
  if (!settings.apiKey) throw new Error("Add your AI API key in Settings. 100% Client-Side: API keys never touch an intermediary server.")
  if (settings.provider === "gemini") {
    const out = await generateWithGemini(prompt, settings.apiKey, settings.model || DEFAULT_GEMINI_MODEL)
    return { text: out, source: "gemini" }
  }
  if (settings.provider === "anthropic") {
    const out = await generateWithAnthropic(prompt, settings.apiKey, settings.model)
    return { text: out, source: "anthropic" }
  }
  if (settings.provider === "openrouter") {
    const base = settings.baseUrl || "https://openrouter.ai/api/v1"
    const model = settings.model || "meta-llama/llama-3.3-70b-instruct"
    const out = await generateWithOpenAI(prompt, settings.apiKey, model, base)
    return { text: out, source: "openrouter" }
  }
  const base = settings.provider === "groq"
    ? "https://api.groq.com/openai/v1"
    : (settings.baseUrl || DEFAULT_OPENAI_BASE)
  const model = settings.model || (settings.provider === "groq" ? DEFAULT_GROQ_MODEL : "")
  if (!model) throw new Error("Specify a model name for this provider.")
  const out = await generateWithOpenAI(prompt, settings.apiKey, model, base)
  return { text: out, source: settings.provider }
}
