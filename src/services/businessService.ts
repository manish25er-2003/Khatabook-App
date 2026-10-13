import { collection, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { Business, BusinessMember } from '../types'

function getDatabase() {
  if (!firebaseDb) {
    throw new Error('Firebase is not configured.')
  }

  return firebaseDb
}

export async function createBusiness(business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> & { ownerId: string }) {
  const db = getDatabase()
  const userRef = doc(db, 'users', business.ownerId)

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef)
    const existingBusinessId = userSnapshot.data()?.businessId
    if (typeof existingBusinessId === 'string') {
      const existingRef = doc(db, 'businesses', existingBusinessId)
      const existingSnapshot = await transaction.get(existingRef)
      if (existingSnapshot.exists()) {
        const existingBusiness = existingSnapshot.data() as Business
        if (existingBusiness.ownerId !== business.ownerId) {
          throw new Error('The existing business record does not belong to this account.')
        }
        return { ...existingBusiness, id: existingSnapshot.id }
      }
    }

    const businessRef = doc(collection(db, 'businesses'))
    const now = new Date().toISOString()
    const ownerMember: BusinessMember = {
      uid: business.ownerId,
      name: business.name,
      email: '',
      role: 'owner',
      status: 'active',
      joinedAt: now,
    }

    transaction.set(businessRef, {
      ...business,
      createdAt: now,
      updatedAt: now,
    })
    transaction.set(doc(db, 'businesses', businessRef.id, 'members', business.ownerId), ownerMember)
    transaction.set(userRef, { businessId: businessRef.id }, { merge: true })

    return { id: businessRef.id, ...business, createdAt: now, updatedAt: now } as Business
  })
}

export async function getBusiness(businessId: string) {
  const ref = doc(getDatabase(), 'businesses', businessId)
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Business) : null
}

export async function getBusinessesForUser(userId: string) {
  const ref = collection(getDatabase(), 'businesses')
  const q = query(ref, where('ownerId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id } as Business))
}

export async function addMemberToBusiness(businessId: string, member: BusinessMember) {
  const ref = doc(getDatabase(), 'businesses', businessId, 'members', member.uid)
  const { joinedAt, ...memberData } = member
  await setDoc(ref, { ...memberData, joinedAt: joinedAt ?? new Date().toISOString() })
}

export async function updateBusiness(businessId: string, data: Partial<Business>) {
  const ref = doc(getDatabase(), 'businesses', businessId)
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
}
