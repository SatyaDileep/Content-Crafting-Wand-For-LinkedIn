import { createContext, useContext, useEffect, useState } from "react"

type User = { name: string; email: string; picture: string; sub: string } | null

type AuthCtx = {
  user: User
  setUser: (u: User)=>void
  apiKey: string
  setApiKey: (k: string)=>void
  googleClientId: string
  signOut: ()=>void
}

const Ctx = createContext<AuthCtx>(null as any)

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [user, setUser] = useState<User>(()=>{
    try{ const v = localStorage.getItem("cc_user"); return v? JSON.parse(v): null }catch{ return null }
  })
  const [apiKey, setApiKeyRaw] = useState(()=> localStorage.getItem("cc_gemini_key") || "")
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string || ""
  const setApiKey = (k: string)=>{ setApiKeyRaw(k); if(k) localStorage.setItem("cc_gemini_key", k); else localStorage.removeItem("cc_gemini_key") }
  useEffect(()=>{ if(user) localStorage.setItem("cc_user", JSON.stringify(user)); else localStorage.removeItem("cc_user") }, [user])
  const signOut = ()=> setUser(null)
  return <Ctx.Provider value={{ user, setUser, apiKey, setApiKey, googleClientId, signOut }}>{children}</Ctx.Provider>
}
export const useAuth = ()=> useContext(Ctx)
