import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { NotificationItem } from '../types'

const notificationsCollection = (businessId: string) => collection(firebaseDb, 'businesses', businessId, 'notifications')

export async function createNotification(businessId: string, notification: Omit<NotificationItem, 'id' | 'businessId' | 'createdAt'>) {
  const ref = notificationsCollection(businessId)
  const docRef = await addDoc(ref, {
    ...notification,
    businessId,
    createdAt: new Date().toISOString(),
  })
  return { id: docRef.id, businessId, ...notification }
}

export async function getNotifications(businessId: string) {
  const ref = notificationsCollection(businessId)
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as NotificationItem) } as NotificationItem))
}

export async function markNotificationRead(businessId: string, notificationId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'notifications', notificationId)
  await updateDoc(ref, { read: true })
}
