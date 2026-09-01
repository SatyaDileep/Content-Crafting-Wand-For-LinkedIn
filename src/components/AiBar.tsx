import { useState } from "react"
import { callAI, callAIWithPrompt, buildCustomImprovePrompt, PROVIDER_LABELS, type GeminiAction, type AIProviderType } from "../lib/gemini"
import { useAuth } from "../lib/auth"
import { track } from "../lib/telemetry"

type SimpleAction = Exclude<GeminiAction, "generateThought" | "generateTitleHeader">

const AI_ACTIONS: { a: SimpleAction; label: string }[] = [
  { a: "improve", label: "✨ Improve" },
  { a: "emojis", label: "😊 Add Emojis" },
  { a: "professional", label: "💼 Pro" },
  { a: "hashtags", label: "🏷️ Hashtags" },
  { a: "hook", label: "🎣 Hook" },
  { a: "defluff", label: "✂️ De-Fluff" },
  { a: "extractQuote", label: "💬 Quote" },
]

const IMPROVE_PRESETS = [
  "Stronger hook in the first line",
  "Fix grammar & tighten clarity",
  "Make it concise & punchy",
  "More storytelling / viral tone",
  "Make it more professional",
  "Add a compelling CTA",
]

const PROVIDER_COLORS: Record<AIProviderType, string> = {
  gemini: "#4285F4",
  groq: "#F55036",
  openai: "#10A37F",
  anthropic: "#D4A574",
  openrouter: "#8B5CF6",
}

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <span className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent" style={{ width: size, height: size }} />
  )
}

function Btn({ a, label, loading, onClick }: { a: SimpleAction; label: string; loading: SimpleAction | null; onClick: (a: SimpleAction) => void }) {
  const isLoading = loading === a
  return (
    <button disabled={!!loading} onClick={() => onClick(a)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
      {isLoading && <Spinner />}
      {isLoading ? "Working…" : label}
    </button>
  )
}

function normalizePost(t: string): string {
  t = t.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
  t = t.replace(/\n\n([•\-\*] )/g, "\n$1")
  t = t.replace(/\n{2,}#/g, "\n#")
  let lines = t.split("\n")
  let out: string[] = []
  let blankStreak = 0
  for (const line of lines) {
    const isBlank = line.trim() === ""
    if (isBlank) { blankStreak++; if (blankStreak > 1) continue }
    else blankStreak = 0
    out.push(line)
  }
  t = out.join("\n").trim()
  if ((t.match(/\n\n/g) || []).length > 4) {
    let parts = t.split(/\n\n/)
    t = parts.slice(0, 5).join("\n\n") + (parts.length > 5 ? "\n\n" + parts.slice(5).join(" ") : "")
  }
  return t
}
function cleanOutput(text: string, isHashtags: boolean): string {
  let t = text.replace(/\r\n/g, "\n")
  if (isHashtags) return t.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").replace(/^[^\#]*?(#)/, "$1").trim()
  return normalizePost(t)
}

export default function AiBar({ text, onResult, onBusy }: { text: string; onResult: (t: string) => void; onBusy?: (msg: string | null) => void }) {
  const { aiProvider, aiKey, aiModel, aiBase } = useAuth()
  const [loading, setLoading] = useState<SimpleAction | null>(null)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [improveOpen, setImproveOpen] = useState(false)
  const [improveChoice, setImproveChoice] = useState("")
  const [improveCustom, setImproveCustom] = useState("")

  async function run(a: SimpleAction) {
    if (a === "improve") { setImproveOpen(true); return }
    await execAI(a)
  }

  async function execAI(a: SimpleAction, customPrompt?: string) {
    setError("")
    setInfo("")
    if (!aiKey) { setError(`Add your ${PROVIDER_LABELS[aiProvider]} API key in Settings to enable AI.`); return }
    if (!text.trim()) { setError("Write something first."); return }
    track("ai_click", { action: a, provider: aiProvider, has_custom: !!customPrompt })
    if (a === "emojis") track("emoji_ai_click", { provider: aiProvider })
    const busyMsg = a === "hashtags" ? "Finding best hashtags…" : a === "emojis" ? "Adding emojis…" : a === "professional" ? "Polishing tone…" : "Improving post…"
    setLoading(a); onBusy?.(busyMsg)
    try {
      const settings = { provider: aiProvider, apiKey: aiKey, model: aiModel, baseUrl: aiBase }
      const raw = customPrompt
        ? (await callAIWithPrompt(customPrompt, settings)).text
        : (await callAI(a, text, settings)).text
      const cleaned = cleanOutput(raw, a === "hashtags")
      if (a === "hashtags") {
        const sep = text.trim().endsWith("\n") ? "" : "\n"
        const alreadyHas = cleaned.split(/\s+/).every(tok => text.includes(tok))
        if (alreadyHas) { setInfo("Those hashtags are already in your post."); return }
        onResult(text.trimEnd() + sep + cleaned)
      } else {
        onResult(cleaned)
      }
      track("ai_success", { action: a, provider: aiProvider })
      setInfo(`⚡ Powered by ${PROVIDER_LABELS[aiProvider]}`)
    } catch (e: any) { track("ai_error", { action: a, provider: aiProvider }); setError(e.message || "Failed") }
    finally { setLoading(null); onBusy?.(null) }
  }

  function confirmImprove() {
    const instruction = improveCustom.trim() || improveChoice
    if (!instruction) { setError("Pick a style or type how to improve."); return }
    setImproveOpen(false)
    const prompt = buildCustomImprovePrompt(text, instruction)
    execAI("improve", prompt)
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

      {improveOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setImproveOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl p-5">
            <div className="font-bold text-sm text-gray-900 dark:text-zinc-100">How should we improve your post?</div>
            <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Pick a preset or describe exactly what you want.</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {IMPROVE_PRESETS.map(p => (
                <button key={p} onClick={() => setImproveChoice(p)}
                  className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition ${improveChoice === p ? "bg-[#0A66C2] text-white border-[#0A66C2]" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"}`}>
                  {p}
                </button>
              ))}
            </div>
            <textarea value={improveCustom} onChange={e => setImproveCustom(e.target.value)} placeholder="Or type custom: e.g. 'Make it witty and add bullet takeaways'" rows={2} className="mt-3 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-[#0A66C2] placeholder:text-gray-400" />
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setImproveOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300">Cancel</button>
              <button onClick={confirmImprove} disabled={loading === "improve"} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#0A66C2] text-white hover:bg-[#004182] disabled:opacity-40">
                {loading === "improve" && <Spinner size={12} />}Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
