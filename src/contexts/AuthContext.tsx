import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseAuth, firebaseDb } from '../firebase/config'
import type { UserProfile } from '../types'

interface AuthContextType {
  currentUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseAuth || !firebaseDb) {
      setCurrentUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setCurrentUser(user)

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const profileRef = doc(firebaseDb, 'users', user.uid)
        const profileSnap = await getDoc(profileRef)
        setProfile(profileSnap.exists() ? ({ id: user.uid, ...(profileSnap.data() as UserProfile) } as UserProfile) : null)
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      profile,
      loading,
      isAuthenticated: Boolean(currentUser),
    }),
    [currentUser, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }

  return context
}
