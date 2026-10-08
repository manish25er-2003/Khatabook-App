import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { Reminder } from '../types'

const reminderCollection = (businessId: string) => collection(firebaseDb, 'businesses', businessId, 'reminders')

export async function createReminder(businessId: string, reminder: Omit<Reminder, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) {
  const ref = reminderCollection(businessId)
  const docRef = await addDoc(ref, {
    ...reminder,
    businessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return { id: docRef.id, businessId, ...reminder }
}

export async function getReminders(businessId: string) {
  const ref = reminderCollection(businessId)
  const q = query(ref, orderBy('dueDate', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Reminder) } as Reminder))
}

export async function updateReminder(businessId: string, reminderId: string, data: Partial<Reminder>) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'reminders', reminderId)
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteReminder(businessId: string, reminderId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'reminders', reminderId)
  await deleteDoc(ref)
}

export async function markReminderAsSent(businessId: string, reminderId: string) {
  await updateReminder(businessId, reminderId, { status: 'sent' })
}

export async function markReminderAsPaid(businessId: string, reminderId: string) {
  await updateReminder(businessId, reminderId, { status: 'paid' })
}

export async function getReminderByStatus(businessId: string, status: Reminder['status']) {
  const ref = reminderCollection(businessId)
  const q = query(ref, where('status', '==', status), orderBy('dueDate', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Reminder) } as Reminder))
}
