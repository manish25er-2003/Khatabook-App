import { collection, getDocs, query, where } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { CustomerTransaction } from '../types'

export async function getDashboardMetrics(businessId: string) {
  const ref = collection(firebaseDb, 'businesses', businessId, 'customers')
  const customerSnap = await getDocs(ref)

  let totalGiven = 0
  let totalReceived = 0

  for (const customerDoc of customerSnap.docs) {
    const transactionsRef = collection(firebaseDb, 'businesses', businessId, 'customers', customerDoc.id, 'transactions')
    const transactionSnap = await getDocs(transactionsRef)
    transactionSnap.forEach((transactionDoc) => {
      const data = transactionDoc.data() as CustomerTransaction
      if (data.type === 'given') totalGiven += Number(data.amount)
      if (data.type === 'received') totalReceived += Number(data.amount)
    })
  }

  return {
    totalGiven,
    totalReceived,
    totalReceivable: Math.max(totalGiven - totalReceived, 0),
    totalPayable: Math.max(totalReceived - totalGiven, 0),
  }
}

export async function getTransactionsForRange(businessId: string, start: string, end: string) {
  const customerRef = collection(firebaseDb, 'businesses', businessId, 'customers')
  const customerSnap = await getDocs(customerRef)
  const items: CustomerTransaction[] = []

  for (const customerDoc of customerSnap.docs) {
    const tRef = collection(firebaseDb, 'businesses', businessId, 'customers', customerDoc.id, 'transactions')
    const q = query(tRef, where('date', '>=', start), where('date', '<=', end))
    const snap = await getDocs(q)
    snap.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...(docSnap.data() as CustomerTransaction) })
    })
  }

  return items
}
