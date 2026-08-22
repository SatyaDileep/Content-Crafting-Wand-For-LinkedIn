import { useEffect, useRef } from "react"
import { useAuth } from "../lib/auth"

declare global { interface Window { google?: any } }

export default function SettingsModal({ open, onClose }: { open:boolean; onClose:()=>void }){
  const { user, setUser, apiKey, setApiKey, googleClientId, signOut } = useAuth()
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    if(!open || !googleClientId || user || !btnRef.current || !window.google) return
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (res:any)=>{
        try{
          const payload = JSON.parse(atob(res.credential.split(".")[1]))
          setUser({ name: payload.name, email: payload.email, picture: payload.picture, sub: payload.sub })
        }catch{}
      }
    })
    window.google.accounts.id.renderButton(btnRef.current, { theme:"outline", size:"large", width: 280 })
  }, [open, googleClientId, user, setUser])

  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-[520px] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="font-bold">Settings · Privacy First</div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full border">✕</button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-xs leading-5">
            <b>Your data stays on your device.</b> Nothing is sent to any server. AI features use your own Gemini key, sent directly from your browser to Google. Remove anytime.
          </div>

          <div>
            <div className="text-sm font-semibold">Google Sign-In (optional)</div>
            <div className="text-xs text-zinc-500 mt-1">Sign in for AI features. Only your name and photo are stored locally on your device.</div>
            <div className="mt-3">
              {user ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-zinc-50 dark:bg-zinc-800">
                  <img src={user.picture} alt="" className="w-9 h-9 rounded-full"/>
                  <div><div className="text-sm font-medium">{user.name}</div><div className="text-xs text-zinc-500">{user.email}</div></div>
                  <button onClick={signOut} className="ml-auto text-xs px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900">Sign out</button>
                </div>
              ) : googleClientId ? (
                <div ref={btnRef} />
              ) : (
                <div className="text-xs p-3 rounded-xl border border-dashed">Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code> to enable Google Sign-In. Or skip — AI works with just the API key below.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Gemini API Key</div>
            <div className="text-xs text-zinc-500 mt-1">Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-[#0A66C2]">aistudio.google.com/app/apikey</a> · Stored in your browser only</div>
            <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="AIza..." type="password" className="mt-2 w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-zinc-800 dark:border-zinc-700"/>
            <div className="mt-2 flex gap-2">
              <button onClick={()=>setApiKey("")} className="text-xs px-3 py-1.5 rounded-full border">Clear key</button>
              <span className="text-[11px] text-zinc-500 self-center">{apiKey ? "✓ Key saved locally" : "No key set — AI buttons will prompt"}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-semibold">Done</button>
            <a href="https://ai.google.dev/gemini-api/docs" target="_blank" className="px-4 py-2.5 rounded-xl border text-sm">Docs</a>
          </div>
        </div>
      </div>
    </div>
  )
}
