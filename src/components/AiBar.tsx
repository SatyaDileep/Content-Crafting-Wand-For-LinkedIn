import { useState } from "react"
import { callGemini, type GeminiAction } from "../lib/gemini"
import { useAuth } from "../lib/auth"

const AI_ACTIONS: { a: GeminiAction; label: string }[] = [
  { a: "improve", label: "✨ Improve" },
  { a: "emojis", label: "😊 Add Emojis" },
  { a: "professional", label: "💼 Pro" },
  { a: "generate", label: "🤖 Auto-Generate" },
]

function Btn({ a, label, loading, onClick }: { a: GeminiAction; label: string; loading: GeminiAction | null; onClick: (a: GeminiAction) => void }) {
  return (
    <button disabled={!!loading} onClick={() => onClick(a)}
      className="px-3 py-1.5 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
      {loading === a ? "…" : label}
    </button>
  )
}

export default function AiBar({ text, onResult }: { text: string; onResult: (t: string) => void }) {
  const { apiKey } = useAuth()
  const [loading, setLoading] = useState<GeminiAction | null>(null)
  const [error, setError] = useState("")

  async function run(a: GeminiAction) {
    setError("")
    if (!apiKey) { setError("Add your Gemini key in Settings to enable AI."); return }
    if (!text.trim() && a !== "generate") { setError("Write something first."); return }
    setLoading(a)
    try {
      const out = await callGemini(a, text, apiKey)
      onResult(out)
    } catch (e: any) { setError(e.message || "Failed") }
    finally { setLoading(null) }
  }

  return (
    <div className="p-2.5 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
      <div className="flex flex-wrap gap-1.5">
        {AI_ACTIONS.map(({ a, label }) => (
          <Btn key={a} a={a} label={label} loading={loading} onClick={run} />
        ))}
        <span className="ml-auto text-[11px] text-gray-400 dark:text-zinc-500 self-center hidden sm:inline">Powered by Gemini</span>
      </div>
      {error && (
        <div className="mt-2 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">{error}</div>
      )}
    </div>
  )
}
