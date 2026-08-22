import { useState } from "react"
import { callGemini, type GeminiAction } from "../lib/gemini"
import { useAuth } from "../lib/auth"

export default function AiBar({ text, onResult }: { text: string; onResult: (t: string)=>void }){
  const { apiKey } = useAuth()
  const [loading, setLoading] = useState<GeminiAction | null>(null)
  const [error, setError] = useState("")
  async function run(a: GeminiAction){
    setError("")
    if(!apiKey){ setError("Add your Gemini API key in Settings — stored locally, never sent to us."); return }
    if(!text.trim() && a!=="generate"){ setError("Write something first."); return }
    setLoading(a)
    try{
      const out = await callGemini(a, text, apiKey)
      onResult(out)
    }catch(e:any){ setError(e.message || "Failed") }
    finally{ setLoading(null) }
  }
  const Btn = ({ a, label }: { a: GeminiAction; label: string })=>(
    <button disabled={!!loading} onClick={()=>run(a)} className="px-3 py-1.5 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
      {loading===a ? "…" : label}
    </button>
  )
  return (
    <div className="p-2.5 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-zinc-800 dark:to-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex flex-wrap gap-1.5">
        <Btn a="improve" label="✨ Improve" />
        <Btn a="emojis" label="😊 Add Emojis" />
        <Btn a="professional" label="💼 Pro" />
        <Btn a="generate" label="🤖 Auto-Generate" />
        <span className="ml-auto text-[11px] text-zinc-500 self-center hidden sm:inline">BYO Gemini key • local only</span>
      </div>
      {error && <div className="mt-2 text-xs px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">{error}</div>}
    </div>
  )
}
