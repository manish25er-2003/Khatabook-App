import { doc, setDoc } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import { loginUser, logoutUser, registerUser, resetPassword } from '../firebase/auth'
import type { UserProfile } from '../types'

export async function signUpUser(payload: { name: string; email: string; phone: string; password: string }) {
  const user = await registerUser({
    email: payload.email,
    password: payload.password,
    name: payload.name,
  })

  const profile: UserProfile = {
    uid: user.uid,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await setDoc(doc(firebaseDb, 'users', user.uid), profile)
  return user
}

export async function signInUser(email: string, password: string) {
  return loginUser(email, password)
}

export async function signOutUser() {
  await logoutUser()
}

export async function requestPasswordReset(email: string) {
  await resetPassword(email)
}
