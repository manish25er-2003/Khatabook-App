import { serverTimestamp, Timestamp } from 'firebase/firestore'

export const getFirebaseTimestamp = () => serverTimestamp()

export const toDateString = (value: Timestamp | string | null | undefined): string => {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  return value.toDate().toISOString()
}
