import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { Customer } from '../types'

const customerCollection = (businessId: string) => collection(firebaseDb, 'businesses', businessId, 'customers')

export async function createCustomer(businessId: string, customer: Omit<Customer, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) {
  const ref = customerCollection(businessId)
  const docRef = await addDoc(ref, {
    ...customer,
    businessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return { id: docRef.id, businessId, ...customer }
}

export async function getCustomer(businessId: string, customerId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'customers', customerId)
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as Customer) } as Customer) : null
}

export async function getCustomers(businessId: string, pageSize = 20, lastDoc?: unknown) {
  const ref = customerCollection(businessId)
  let q = query(ref, orderBy('createdAt', 'desc'), limit(pageSize))
  if (lastDoc) {
    q = query(ref, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize))
  }
  const snapshot = await getDocs(q)
  return {
    items: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Customer) } as Customer)),
    lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null,
  }
}

export async function updateCustomer(businessId: string, customerId: string, data: Partial<Customer>) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'customers', customerId)
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteCustomer(businessId: string, customerId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'customers', customerId)
  await deleteDoc(ref)
}

export async function searchCustomers(businessId: string, term: string) {
  const ref = customerCollection(businessId)
  const q = query(ref, where('name', '>=', term), where('name', '<=', `${term}\uf8ff`))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Customer) } as Customer))
}
