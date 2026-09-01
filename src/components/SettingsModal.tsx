import { useAuth } from "../lib/auth"
import { GEMINI_MODELS, GROQ_MODELS, PROVIDER_LABELS, DEFAULT_OPENAI_BASE, type AIProviderType } from "../lib/gemini"

const inputCls = "mt-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-zinc-500"

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { aiProvider, setAiProvider, aiKey, setAiKey, aiModel, setAiModel, aiBase, setAiBase } = useAuth()

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[520px] rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-900 dark:text-zinc-100">Settings</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">✕</button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-xs leading-5 text-emerald-800 dark:text-emerald-300">
            <b>100% Client-Side: API keys never touch an intermediary server.</b> Keys in localStorage only, sent directly to provider.
          </div>

          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 p-3 space-y-3">
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-zinc-200">AI Provider</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Pick any provider. Keys stay in your browser only.</div>
              <select value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProviderType)} className={`${inputCls} cursor-pointer`}>
                {(Object.keys(PROVIDER_LABELS) as AIProviderType[]).map(p => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-zinc-300">API Key</div>
              <input value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder={aiProvider === "gemini" ? "AIza..." : aiProvider === "groq" ? "gsk_..." : "sk-..."} type="password" className={inputCls} />
            </div>

            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-zinc-300">Model</div>
              {aiProvider === "gemini" ? (
                <select value={aiModel} onChange={e => setAiModel(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  {GEMINI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              ) : aiProvider === "groq" ? (
                <select value={aiModel} onChange={e => setAiModel(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  {GROQ_MODELS.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              ) : aiProvider === "anthropic" ? (
                <input value={aiModel} onChange={e => setAiModel(e.target.value)} placeholder="claude-3-5-sonnet-20241022" className={inputCls} />
              ) : (
                <input value={aiModel} onChange={e => setAiModel(e.target.value)} placeholder={aiProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "gpt-4o-mini"} className={inputCls} />
              )}
            </div>

            {(aiProvider === "openai" || aiProvider === "openrouter") && (
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-zinc-300">Base URL</div>
                <input value={aiBase} onChange={e => setAiBase(e.target.value)} placeholder={aiProvider === "openrouter" ? "https://openrouter.ai/api/v1" : DEFAULT_OPENAI_BASE} className={inputCls} />
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">OpenAI-compatible endpoint (OpenRouter, Together, local LLMs, etc.).</div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => { setAiKey(""); setAiBase("") }} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition">Clear</button>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">{aiKey ? `✓ ${PROVIDER_LABELS[aiProvider]} ready` : "Not set"}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition">Done</button>
            <span className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-400 dark:text-zinc-500">Keys never leave this browser</span>
          </div>
        </div>
      </div>
    </div>
  )
}
