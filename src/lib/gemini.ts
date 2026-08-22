export type GeminiAction = "improve" | "emojis" | "professional" | "generate" | "hashtags"

const PROMPTS: Record<GeminiAction, (text: string)=>string> = {
  improve: t => `You are a LinkedIn ghostwriter. Improve this post for clarity, hook, and engagement while keeping markdown bold (**text**) and bullets. Keep under 180 words. Return only the improved post:\n\n${t}`,
  emojis: t => `Add 3-5 relevant emojis to this LinkedIn post naturally. Keep markdown. Return only the post:\n\n${t}`,
  professional: t => `Rewrite this LinkedIn post in a crisp, professional, executive tone. Keep markdown formatting. Return only the post:\n\n${t}`,
  generate: t => `Generate a viral LinkedIn post from this idea/topic. Use a strong hook (first line), 3-5 line story, 3 bullet takeaways, and a question CTA. Use markdown **bold** sparingly and include 3 hashtags. Idea: ${t || "Share a lesson about building in public"}`,
  hashtags: t => `Suggest 5 concise LinkedIn hashtags for this post (space-separated, with #). Post:\n\n${t}`,
}

export async function callGemini(action: GeminiAction, text: string, apiKey: string, model="gemini-2.0-flash"): Promise<string> {
  if(!apiKey) throw new Error("Missing Gemini API key. Add it in Settings.")
  const prompt = PROMPTS[action](text)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ temperature:0.7, maxOutputTokens: 1200 } })
  })
  if(!res.ok){
    const e = await res.text()
    throw new Error(`Gemini ${res.status}: ${e.slice(0,400)}`)
  }
  const data = await res.json()
  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if(!out) throw new Error("Empty response from Gemini")
  return out.trim()
}
