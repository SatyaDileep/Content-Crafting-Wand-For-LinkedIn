import { useState } from "react"
import { callAI, PROVIDER_LABELS, type GeminiAction, type AIProviderType } from "../lib/gemini"
import { useAuth } from "../lib/auth"

const AI_ACTIONS: { a: GeminiAction; label: string }[] = [
  { a: "improve", label: "✨ Improve" },
  { a: "emojis", label: "😊 Add Emojis" },
  { a: "professional", label: "💼 Pro" },
  { a: "hashtags", label: "🏷️ Hashtags" },
  { a: "generate", label: "🤖 Auto-Generate" },
]

const PROVIDER_COLORS: Record<AIProviderType, string> = {
  gemini: "#4285F4",
  groq: "#F55036",
  openai: "#10A37F",
}

function Btn({ a, label, loading, onClick }: { a: GeminiAction; label: string; loading: GeminiAction | null; onClick: (a: GeminiAction) => void }) {
  return (
    <button disabled={!!loading} onClick={() => onClick(a)}
      className="px-3 py-1.5 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
      {loading === a ? "…" : label}
    </button>
  )
}

export default function AiBar({ text, onResult }: { text: string; onResult: (t: string) => void }) {
  const { aiProvider, aiKey, aiModel, aiBase } = useAuth()
  const [loading, setLoading] = useState<GeminiAction | null>(null)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  async function run(a: GeminiAction) {
    setError("")
    setInfo("")
    if (!aiKey) { setError(`Add your ${PROVIDER_LABELS[aiProvider]} API key in Settings to enable AI.`); return }
    if (!text.trim() && a !== "generate") { setError("Write something first."); return }
    setLoading(a)
    try {
      const { text: out, source } = await callAI(a, text, { provider: aiProvider, apiKey: aiKey, model: aiModel, baseUrl: aiBase })
      onResult(out)
      setInfo(`⚡ Powered by ${PROVIDER_LABELS[source as AIProviderType]}`)
    } catch (e: any) { setError(e.message || "Failed") }
    finally { setLoading(null) }
  }

  return (
    <div className="p-2.5 bg-gray-50/70 dark:bg-zinc-900/40 border-b border-gray-200/60 dark:border-zinc-800">
      <div className="flex flex-wrap gap-1.5">
        {AI_ACTIONS.map(({ a, label }) => (
          <Btn key={a} a={a} label={label} loading={loading} onClick={run} />
        ))}
        <span className={`ml-auto text-[11px] text-gray-400 dark:text-zinc-500 self-center inline-flex items-center gap-1.5 transition-opacity ${aiKey ? "opacity-100" : "opacity-60"}`} title="AI runs on your own API key — it never touches our servers.">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: PROVIDER_COLORS[aiProvider] }} />
          {PROVIDER_LABELS[aiProvider]}
        </span>
      </div>
      {error && (
        <div className="mt-2 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">{error}</div>
      )}
      {info && !error && (
        <div className="mt-2 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">{info}</div>
      )}
    </div>
  )
}
