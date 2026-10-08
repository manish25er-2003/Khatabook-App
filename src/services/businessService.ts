import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { firebaseDb } from '../firebase/config'
import type { Business, BusinessMember } from '../types'

export async function createBusiness(business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> & { ownerId: string }) {
  const ref = collection(firebaseDb, 'businesses')
  const docRef = await addDoc(ref, {
    ...business,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const ownerMember: BusinessMember = {
    uid: business.ownerId,
    name: business.name,
    email: '',
    role: 'owner',
    status: 'active',
    joinedAt: new Date().toISOString(),
  }

  await setDoc(doc(firebaseDb, 'businesses', docRef.id, 'members', business.ownerId), ownerMember)

  return { id: docRef.id, ...business }
}

export async function getBusiness(businessId: string) {
  const ref = doc(firebaseDb, 'businesses', businessId)
  const snapshot = await getDoc(ref)
  return snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as Business) } as Business) : null
}

export async function getBusinessesForUser(userId: string) {
  const ref = collection(firebaseDb, 'businesses')
  const q = query(ref, where('ownerId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Business) } as Business))
}

export async function addMemberToBusiness(businessId: string, member: BusinessMember) {
  const ref = doc(firebaseDb, 'businesses', businessId, 'members', member.uid)
  await setDoc(ref, { ...member, joinedAt: member.joinedAt ?? new Date().toISOString() })
}

export async function updateBusiness(businessId: string, data: Partial<Business>) {
  const ref = doc(firebaseDb, 'businesses', businessId)
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() })
}
