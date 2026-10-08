import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { firebaseDb, isFirebaseConfigured } from '../firebase/config'
import type { LoanApplication, LoanOffer } from '../types'

export const demoLoanOffer: LoanOffer = {
  id: 'offer-business-loan',
  businessId: 'demo-business',
  title: 'Business Loan',
  subtitle: 'You may be eligible for up to ₹50,000',
  maxAmount: 50000,
  status: 'active',
  eligibilityRequired: true,
  providerName: 'KhataPro Capital',
  applicationUrl: '/loans/offer-business-loan',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const loanOffersCollection = (businessId: string) => collection(firebaseDb as any, 'businesses', businessId, 'loanOffers')
const loanApplicationsCollection = (businessId: string) => collection(firebaseDb as any, 'businesses', businessId, 'loanApplications')

export async function getAvailableLoanOffers(businessId: string): Promise<LoanOffer[]> {
  if (!isFirebaseConfigured || !firebaseDb) {
    return [demoLoanOffer]
  }

  const q = query(loanOffersCollection(businessId), where('status', '==', 'active'))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return [demoLoanOffer]
  }

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<LoanOffer, 'id'>),
  }))
}

export async function checkLoanEligibility(businessId: string) {
  const offers = await getAvailableLoanOffers(businessId)
  const activeOffer = offers[0]

  if (!activeOffer) {
    return {
      eligible: false,
      maxAmount: 0,
      status: 'not_available',
      message: 'No loan offer is currently active for this business.',
      source: 'backend',
    }
  }

  return {
    eligible: true,
    maxAmount: activeOffer.maxAmount,
    status: 'available',
    message: `You may be eligible for a business loan up to ₹${activeOffer.maxAmount.toLocaleString('en-IN')}.`,
    source: isFirebaseConfigured ? 'backend' : 'demo',
  }
}

export async function trackLoanOfferView(businessId: string, offerId: string, userId: string) {
  if (!isFirebaseConfigured || !firebaseDb) return

  const ref = doc(firebaseDb, 'businesses', businessId, 'loanOfferViews', `${offerId}-${userId}-${Date.now()}`)
  await setDoc(ref, {
    businessId,
    offerId,
    userId,
    viewedAt: new Date().toISOString(),
  })
}

export async function trackLoanOfferClick(businessId: string, offerId: string, userId: string) {
  if (!isFirebaseConfigured || !firebaseDb) return

  const ref = doc(firebaseDb, 'businesses', businessId, 'loanOfferClicks', `${offerId}-${userId}-${Date.now()}`)
  await setDoc(ref, {
    businessId,
    offerId,
    userId,
    clickedAt: new Date().toISOString(),
  })
}

export async function createLoanApplication(businessId: string, application: Omit<LoanApplication, 'id' | 'businessId' | 'status' | 'createdAt' | 'updatedAt'>) {
  const payload: LoanApplication = {
    id: `loan-app-${Date.now()}`,
    businessId,
    status: 'submitted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...application,
  }

  if (!isFirebaseConfigured || !firebaseDb) {
    return payload
  }

  const ref = doc(firebaseDb, 'businesses', businessId, 'loanApplications', payload.id)
  await setDoc(ref, payload)
  return payload
}

export async function queueEmailNotification(businessId: string, payload: { recipient: string; type: string; subject: string; status: 'queued' | 'sent' | 'failed'; message?: string }) {
  if (!isFirebaseConfigured || !firebaseDb) {
    return {
      id: `email-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
    }
  }

  const ref = await addDoc(collection(firebaseDb, 'businesses', businessId, 'emailLogs'), {
    ...payload,
    createdAt: new Date().toISOString(),
  })

  return { id: ref.id, ...payload, createdAt: new Date().toISOString() }
}
