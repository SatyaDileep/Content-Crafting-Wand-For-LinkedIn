export type GeminiAction = "improve" | "emojis" | "professional" | "generate" | "hashtags" | "generateThought" | "generateTitleHeader"

export type AIProviderType = "gemini" | "groq" | "openai"

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
}

const PROMPTS: Record<GeminiAction, (text: string)=>string> = {
  improve: t => `You are a LinkedIn ghostwriter. Sharpen this post: pull the hook into the first line, boost clarity and engagement, keep markdown **bold** and bullets. Keep it under 180 words and end with 3 relevant hashtags on their own lines. Return only the improved post:\n\n${t}`,
  emojis: t => `Add 4-6 relevant emojis to this LinkedIn post naturally — one in the opening line, a few sprinkled through, none in hashtags. Keep markdown. Return only the post:\n\n${t}`,
  professional: t => `Rewrite this LinkedIn post in a crisp, professional, executive tone that still sounds human. Keep markdown formatting. Return only the post:\n\n${t}`,
  generate: t => `Generate a viral LinkedIn post from this idea. Open with a power hook that lands within the first 210 characters, follow with a 3-5 line story, 3 bullet takeaways, and end with a question CTA plus 5 high-impression hashtags on their own lines. Use markdown **bold** sparingly. Idea: ${t || "Share a lesson about building in public"}`,
  hashtags: t => `You are a LinkedIn growth expert. Recommend 6-8 popular, high-impression hashtags for this post to boost reach. Mix broad categories (like #Productivity, #CareerAdvice) with niche, lower-competition ones (like #BuildInPublic). Return ONLY the hashtags, space-separated, with no numbers or extra commentary:\n\n${t}`,
  generateThought: t => `Based on the following LinkedIn post content, generate a short, insightful, and concise "highlighted thought" that stands out as a pull quote. Maximum 3 lines. Include 1-2 relevant emojis. Return ONLY the thought text, nothing else:\n\n${t}`,
  generateTitleHeader: t => `Based on the following post content, generate a short catchy card title and a concise series header (like "AI-Byte Series #Day24"). Format the response EXACTLY as: Title | Header. Return nothing else:\n\n${t}`,
}

async function generateWithGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ temperature:0.7, maxOutputTokens: 1200 } })
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
      max_tokens: 1200,
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
  if(!settings.apiKey) throw new Error("Add your AI API key in Settings.")

  if(settings.provider === "gemini"){
    const out = await generateWithGemini(prompt, settings.apiKey, settings.model || DEFAULT_GEMINI_MODEL)
    return { text: out, source: "gemini" }
  }

  // groq + openai use the OpenAI-compatible chat completions API
  const base = settings.provider === "groq"
    ? "https://api.groq.com/openai/v1"
    : (settings.baseUrl || DEFAULT_OPENAI_BASE)
  const model = settings.model || (settings.provider === "groq" ? DEFAULT_GROQ_MODEL : "")
  if(!model) throw new Error("Specify a model name for this provider.")
  const out = await generateWithOpenAI(prompt, settings.apiKey, model, base)
  return { text: out, source: settings.provider }
}
