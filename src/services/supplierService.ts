import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { Supplier, SupplierTransaction } from '../types'

const supplierCollection = (businessId: string) => collection(firebaseDb, 'businesses', businessId, 'suppliers')

export async function createSupplier(businessId: string, supplier: Omit<Supplier, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) {
  const ref = supplierCollection(businessId)
  const docRef = await addDoc(ref, {
    ...supplier,
    businessId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return { id: docRef.id, businessId, ...supplier }
}

export async function getSupplier(businessId: string, supplierId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'suppliers', supplierId)
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as Supplier) } as Supplier) : null
}

export async function getSuppliers(businessId: string) {
  const ref = supplierCollection(businessId)
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Supplier) } as Supplier))
}

export async function updateSupplier(businessId: string, supplierId: string, data: Partial<Supplier>) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'suppliers', supplierId)
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteSupplier(businessId: string, supplierId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'suppliers', supplierId)
  await deleteDoc(ref)
}

export async function createSupplierTransaction(
  businessId: string,
  supplierId: string,
  transaction: Omit<SupplierTransaction, 'id' | 'businessId' | 'supplierId' | 'createdAt' | 'updatedAt'>,
) {
  const ref = collection(firebaseDb, 'businesses', businessId, 'suppliers', supplierId, 'transactions')
  const docRef = await addDoc(ref, {
    ...transaction,
    businessId,
    supplierId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return { id: docRef.id, businessId, supplierId, ...transaction }
}

export async function getSupplierTransactions(businessId: string, supplierId: string) {
  const ref = collection(firebaseDb, 'businesses', businessId, 'suppliers', supplierId, 'transactions')
  const q = query(ref, orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as SupplierTransaction) } as SupplierTransaction))
}
