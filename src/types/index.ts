export type Role = 'owner' | 'admin' | 'staff'
export type OpeningBalanceType = 'receivable' | 'payable' | 'settled'
export type TransactionType = 'given' | 'received'
export type SupplierTransactionType = 'purchase' | 'payment'
export type ReminderStatus = 'pending' | 'sent' | 'paid' | 'cancelled'
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other'

export interface UserProfile {
  uid: string
  name: string
  email: string
  phone: string
  photoURL?: string
  businessId?: string
  role?: Role
  onboardingCompleted: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Business {
  id: string
  ownerId: string
  name: string
  category: string
  address?: string
  city?: string
  state?: string
  country?: string
  currency: string
  logoUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface BusinessMember {
  uid: string
  name: string
  email: string
  role: Role
  status: 'active' | 'pending'
  joinedAt?: string
}

export interface Customer {
  id: string
  businessId: string
  name: string
  phone: string
  email?: string
  address?: string
  openingBalance: number
  openingBalanceType: OpeningBalanceType
  notes?: string
  status?: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export interface CustomerTransaction {
  id: string
  businessId: string
  customerId: string
  type: TransactionType
  amount: number
  description: string
  paymentMethod: PaymentMethod
  date: string
  notes?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface Supplier {
  id: string
  businessId: string
  name: string
  phone: string
  email?: string
  address?: string
  openingBalance: number
  notes?: string
  status?: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export interface SupplierTransaction {
  id: string
  businessId: string
  supplierId: string
  type: SupplierTransactionType
  amount: number
  description: string
  paymentMethod: PaymentMethod
  date: string
  notes?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface Reminder {
  id: string
  businessId: string
  customerId: string
  amount: number
  message: string
  dueDate: string
  status: ReminderStatus
  createdAt?: string
  updatedAt?: string
}

export interface NotificationItem {
  id: string
  businessId: string
  userId: string
  title: string
  message: string
  read: boolean
  createdAt?: string
}

export interface DashboardSummary {
  totalReceivable: number
  totalPayable: number
  totalGiven: number
  totalReceived: number
}

export interface LoanOffer {
  id: string
  businessId: string
  title: string
  subtitle: string
  maxAmount: number
  status: 'active' | 'paused' | 'draft'
  eligibilityRequired: boolean
  providerName: string
  applicationUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface LoanApplication {
  id: string
  businessId: string
  userId: string
  offerId: string
  requestedAmount: number
  status: 'draft' | 'submitted' | 'under_review' | 'additional_information_required' | 'approved' | 'rejected' | 'cancelled'
  provider: string
  purpose?: string
  fullName?: string
  mobileNumber?: string
  businessName?: string
  businessCategory?: string
  businessAddress?: string
  createdAt?: string
  updatedAt?: string
}
