import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { CustomerTransaction } from '../types'

const transactionsCollection = (businessId: string, customerId: string) =>
  collection(firebaseDb, 'businesses', businessId, 'customers', customerId, 'transactions')

export async function createTransaction(
  businessId: string,
  customerId: string,
  transaction: Omit<CustomerTransaction, 'id' | 'businessId' | 'customerId' | 'createdAt' | 'updatedAt'>,
) {
  const ref = transactionsCollection(businessId, customerId)
  const docRef = await addDoc(ref, {
    ...transaction,
    businessId,
    customerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return { id: docRef.id, businessId, customerId, ...transaction }
}

export async function getTransactions(businessId: string, customerId: string, pageSize = 20, lastDoc?: unknown) {
  const ref = transactionsCollection(businessId, customerId)
  let q = query(ref, orderBy('date', 'desc'), limit(pageSize))
  if (lastDoc) {
    q = query(ref, orderBy('date', 'desc'), startAfter(lastDoc), limit(pageSize))
  }
  const snapshot = await getDocs(q)
  return {
    items: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as CustomerTransaction) } as CustomerTransaction)),
    lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null,
  }
}

export async function getTransaction(businessId: string, customerId: string, transactionId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'customers', customerId, 'transactions', transactionId)
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as CustomerTransaction) } as CustomerTransaction) : null
}

export async function updateTransaction(
  businessId: string,
  customerId: string,
  transactionId: string,
  data: Partial<CustomerTransaction>,
) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'customers', customerId, 'transactions', transactionId)
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteTransaction(businessId: string, customerId: string, transactionId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'customers', customerId, 'transactions', transactionId)
  await deleteDoc(ref)
}

export async function getCustomerTransactions(businessId: string, customerId: string, type?: 'given' | 'received') {
  const ref = transactionsCollection(businessId, customerId)
  const q = type ? query(ref, where('type', '==', type), orderBy('date', 'desc')) : query(ref, orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as CustomerTransaction) } as CustomerTransaction))
}
