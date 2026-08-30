import { createContext, useContext, useEffect, useState } from "react"
import { DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL, GEMINI_MODELS, GROQ_MODELS, type AIProviderType } from "./gemini"

type User = { name: string; email: string; picture: string; sub: string } | null

type AuthCtx = {
  user: User
  setUser: (u: User)=>void
  aiProvider: AIProviderType
  setAiProvider: (p: AIProviderType)=>void
  aiKey: string
  setAiKey: (k: string)=>void
  aiModel: string
  setAiModel: (m: string)=>void
  aiBase: string
  setAiBase: (b: string)=>void
  googleClientId: string
  signOut: ()=>void
}

const Ctx = createContext<AuthCtx>(null as any)

const geminiIds = GEMINI_MODELS.map(m => m.id)
const groqIds = GROQ_MODELS.map(m => m.id)

function initProvider(): AIProviderType {
  const v = localStorage.getItem("cc_ai_provider")
  if (v === "gemini" || v === "groq" || v === "openai") return v
  // migrate from the old dual-key setup
  if (localStorage.getItem("cc_groq_key") && !localStorage.getItem("cc_gemini_key")) return "groq"
  return "gemini"
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(()=>{
    try{ const v = localStorage.getItem("cc_user"); return v? JSON.parse(v): null }catch{ return null }
  })
  const [aiProvider, setAiProviderRaw] = useState<AIProviderType>(initProvider)
  const [aiKey, setAiKeyRaw] = useState(()=> localStorage.getItem("cc_ai_key") || localStorage.getItem("cc_gemini_key") || localStorage.getItem("cc_groq_key") || "")
  const [aiModel, setAiModelRaw] = useState(()=> {
    const v = localStorage.getItem("cc_ai_model")
    if (v) return v
    const prov = localStorage.getItem("cc_ai_provider")
    if (prov === "gemini") {
      const m = localStorage.getItem("cc_gemini_model")
      return m && geminiIds.includes(m as any) ? m : DEFAULT_GEMINI_MODEL
    }
    if (prov === "groq") {
      const m = localStorage.getItem("cc_groq_model")
      return m && groqIds.includes(m as any) ? m : DEFAULT_GROQ_MODEL
    }
    return DEFAULT_GEMINI_MODEL
  })
  const [aiBase, setAiBaseRaw] = useState(()=> localStorage.getItem("cc_ai_base") || "")
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string || ""
  const setAiProvider = (p: AIProviderType)=>{ setAiProviderRaw(p); localStorage.setItem("cc_ai_provider", p) }
  const setAiKey = (k: string)=>{ setAiKeyRaw(k); if(k) localStorage.setItem("cc_ai_key", k); else localStorage.removeItem("cc_ai_key") }
  const setAiModel = (m: string)=>{ setAiModelRaw(m); localStorage.setItem("cc_ai_model", m) }
  const setAiBase = (b: string)=>{ setAiBaseRaw(b); if(b) localStorage.setItem("cc_ai_base", b); else localStorage.removeItem("cc_ai_base") }
  useEffect(()=>{ if(user) localStorage.setItem("cc_user", JSON.stringify(user)); else localStorage.removeItem("cc_user") }, [user])
  const signOut = ()=> setUser(null)
  return <Ctx.Provider value={{ user, setUser, aiProvider, setAiProvider, aiKey, setAiKey, aiModel, setAiModel, aiBase, setAiBase, googleClientId, signOut }}>{children}</Ctx.Provider>
}
export const useAuth = ()=> useContext(Ctx)
