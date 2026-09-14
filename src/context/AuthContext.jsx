import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser || !currentUser.email) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('teachers')
      .select('id, role, full_name, email, avatar_url')
      .eq('email', currentUser.email)
      .maybeSingle()
    
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      fetchProfile(sessionUser).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      fetchProfile(sessionUser)
    })

    return () => listener.subscription.unsubscribe()
  }, [fetchProfile])

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, teacherId: user?.id ?? null }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
