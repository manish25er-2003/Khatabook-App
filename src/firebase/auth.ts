import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { firebaseAuth } from './config'

export async function registerUser({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name: string
}) {
  const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
  if (name) {
    await updateProfile(userCredential.user, { displayName: name })
  }
  return userCredential.user
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password)
  return userCredential.user
}

export async function logoutUser() {
  await signOut(firebaseAuth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(firebaseAuth, email)
}
