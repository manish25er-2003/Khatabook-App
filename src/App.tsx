import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  CreditCard,
  FileText,
  Globe,
  Info,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  TrendingUp,
  User,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import './App.css'
import developerProfileImage from './assets/developer/manish-kumar.jpg'
import { firebaseDb, isFirebaseConfigured } from './firebase/config'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { signInUser, signOutUser, signUpUser } from './services/authService'
import { createBusiness, getBusiness } from './services/businessService'
import { createCustomer, getCustomers } from './services/customerService'
import { storageService } from './services/storageService'
import { createTransaction, getCustomerTransactions } from './services/transactionService'
import {
  checkLoanEligibility,
  createLoanApplication,
  demoLoanOffer,
  getAvailableLoanOffers,
  queueEmailNotification,
  trackLoanOfferClick,
  trackLoanOfferView,
} from './services/loanService'
import type { Business, Customer, CustomerTransaction, LoanApplication, LoanOffer } from './types'

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const emptyCustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  openingBalance: '0',
  openingBalanceType: 'receivable' as const,
  notes: '',
}

const emptyTransactionForm = {
  amount: '',
  type: 'given' as const,
  description: '',
  paymentMethod: 'cash' as const,
  notes: '',
  date: new Date().toISOString().slice(0, 10),
}

const OWNER_UPI_ID = '7087338600@ybl'
const PAYMENT_STATUSES = ['pending', 'initiated', 'success', 'failed', 'cancelled', 'verified'] as const
const DEFAULT_PROFILE_NAME = 'Er. Manish Kumar Yadav'

type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

type PaymentState = {
  status: PaymentStatus
  amount: number
  reference: string
  note: string
  customerId: string
  createdAt: string
}

const computeCustomerBalance = (customer: Customer, transactions: CustomerTransaction[]) => {
  const opening = Number(customer.openingBalance ?? 0)
  const given = transactions
    .filter((transaction) => transaction.type === 'given')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0)
  const received = transactions
    .filter((transaction) => transaction.type === 'received')
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0)

  return opening + given - received
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { currentUser, profile, loading, isAuthenticated } = useAuthContext()
  const isDemoMode = !isFirebaseConfigured
  const [demoSession, setDemoSession] = useState(false)
  const [screen, setScreen] = useState<'developerIntro' | 'splash' | 'register' | 'login' | 'onboarding' | 'dashboard' | 'customers' | 'khata' | 'addCustomer' | 'addTransaction' | 'paymentSuccess' | 'suppliers' | 'reports' | 'profile' | 'settings' | 'about' | 'developerProfile' | 'loans' | 'loanDetail' | 'loanApplication'>(() => 'developerIntro')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [business, setBusiness] = useState<Business | null>(() => {
    if (typeof window === 'undefined' || !isDemoMode) return null
    const raw = window.localStorage.getItem('khatapro-demo-business')
    return raw ? (JSON.parse(raw) as Business) : demoBusiness
  })
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window === 'undefined' || !isDemoMode) return demoCustomers
    const raw = window.localStorage.getItem('khatapro-demo-customers')
    return raw ? (JSON.parse(raw) as Customer[]) : demoCustomers
  })
  const [transactionsByCustomer, setTransactionsByCustomer] = useState<Record<string, CustomerTransaction[]>>(() => {
    if (typeof window === 'undefined' || !isDemoMode) return demoTransactions
    const raw = window.localStorage.getItem('khatapro-demo-transactions')
    return raw ? (JSON.parse(raw) as Record<string, CustomerTransaction[]>) : demoTransactions
  })
  const [profileForm, setProfileForm] = useState(() => {
    if (typeof window === 'undefined') return demoProfile
    const raw = window.localStorage.getItem('khatapro-profile')
    if (!raw) return demoProfile

    try {
      const parsed = JSON.parse(raw) as Partial<typeof demoProfile>
      const normalizedName = parsed.name && !['Aarav Mehta', 'Aarav Traders'].includes(parsed.name) ? parsed.name : DEFAULT_PROFILE_NAME
      return {
        ...demoProfile,
        ...parsed,
        name: normalizedName,
        photoURL: parsed.photoURL && !parsed.photoURL.includes('images.unsplash.com') ? parsed.photoURL : developerProfileImage,
      }
    } catch {
      return demoProfile
    }
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(demoCustomers[0]?.id ?? null)
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm)
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm)
  const [paymentSuccess, setPaymentSuccess] = useState<{ amount: number; type: 'given' | 'received'; reference: string } | null>(null)
  const [loanOffer, setLoanOffer] = useState<LoanOffer | null>(demoLoanOffer)
  const [loanPopupVisible, setLoanPopupVisible] = useState(false)
  const [loanOfferAmount, setLoanOfferAmount] = useState<number>(demoLoanOffer.maxAmount)
  const [loanTenure, setLoanTenure] = useState<'3 Months' | '6 Months' | '12 Months'>('6 Months')
  const [loanForm, setLoanForm] = useState({
    fullName: profileForm.name,
    mobileNumber: profileForm.phone,
    businessName: business?.name ?? demoBusiness.name,
    businessCategory: business?.category ?? 'Retail',
    businessAddress: business?.address ?? 'MG Road, Bangalore',
    loanAmount: String(demoLoanOffer.maxAmount),
    purpose: 'Working capital and expansion',
  })
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null)
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({})
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, number>>({})
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isStandaloneMode, setIsStandaloneMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState<'profile' | 'developer' | 'appearance' | 'language' | 'notifications' | 'privacy' | 'preferences' | 'support' | 'about' | 'logout'>('profile')
  const [businessLogoPreview, setBusinessLogoPreview] = useState('')
  const [businessLogoFile, setBusinessLogoFile] = useState<File | null>(null)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'system'
    return (window.localStorage.getItem('khatapro-theme') as 'light' | 'dark' | 'system') || 'system'
  })
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi'>(() => {
    if (typeof window === 'undefined') return 'en'
    return (window.localStorage.getItem('khatapro-language') as 'en' | 'hi') || 'en'
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const raw = window.localStorage.getItem('khatapro-notifications')
    return raw === null ? true : raw === 'true'
  })
  const [compactLayout, setCompactLayout] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('khatapro-layout') === 'compact'
  })
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const activeCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0] ?? null,
    [customers, selectedCustomerId],
  )

  const activeCustomerTransactions = activeCustomer ? transactionsByCustomer[activeCustomer.id] ?? [] : []

  const dashboardSummary = useMemo(() => {
    const rows = customers.map((customer) => ({
      customer,
      balance: computeCustomerBalance(customer, transactionsByCustomer[customer.id] ?? []),
    }))

    const totalReceivable = rows.reduce((sum, item) => sum + Math.max(item.balance, 0), 0)
    const totalPayable = rows.reduce((sum, item) => sum + Math.max(-item.balance, 0), 0)
    const totalGiven = rows.reduce(
      (sum, item) => sum + (transactionsByCustomer[item.customer.id] ?? []).filter((tx) => tx.type === 'given').reduce((inner, tx) => inner + Number(tx.amount ?? 0), 0),
      0,
    )
    const totalReceived = rows.reduce(
      (sum, item) => sum + (transactionsByCustomer[item.customer.id] ?? []).filter((tx) => tx.type === 'received').reduce((inner, tx) => inner + Number(tx.amount ?? 0), 0),
      0,
    )

    return { totalReceivable, totalPayable, totalGiven, totalReceived }
  }, [customers, transactionsByCustomer])

  useEffect(() => {
    setLoanForm((prev) => ({
      ...prev,
      fullName: profileForm.name,
      mobileNumber: profileForm.phone,
      businessName: business?.name ?? demoBusiness.name,
      businessCategory: business?.category ?? 'Retail',
      businessAddress: business?.address ?? 'MG Road, Bangalore',
    }))
  }, [profileForm.name, profileForm.phone, business?.name, business?.category, business?.address])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!settingsFeedback) return
    const timeout = window.setTimeout(() => setSettingsFeedback(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [settingsFeedback])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasStaleName = profileForm.name === 'Aarav Mehta' || profileForm.name === 'Aarav Traders'
    if (!profileForm.photoURL || profileForm.photoURL.includes('images.unsplash.com') || hasStaleName) {
      setProfileForm((prev) => ({
        ...prev,
        photoURL: developerProfileImage,
        name: hasStaleName ? DEFAULT_PROFILE_NAME : prev.name || DEFAULT_PROFILE_NAME,
      }))
    }
  }, [profileForm.photoURL, profileForm.name])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('khatapro-theme', themeMode)
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark'
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  }, [themeMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('khatapro-language', selectedLanguage)
  }, [selectedLanguage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('khatapro-notifications', String(notificationsEnabled))
  }, [notificationsEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('khatapro-layout', compactLayout ? 'compact' : 'comfortable')
    document.body.classList.toggle('compact-layout', compactLayout)
  }, [compactLayout])

  useEffect(() => {
    if (screen === 'developerIntro') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('khatapro-has-seen-developer-intro', 'true')
      }
    }
  }, [screen])

  useEffect(() => {
    if (!settingsOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [settingsOpen])

  useEffect(() => {
    if (!activeCustomer) return
    const outstanding = Math.max(
      computeCustomerBalance(activeCustomer, activeCustomerTransactions),
      0,
    )

    setPaymentDrafts((prev) => ({
      ...prev,
      [activeCustomer.id]: prev[activeCustomer.id] ?? outstanding,
    }))
  }, [activeCustomer, activeCustomerTransactions])

  useEffect(() => {
    const handleReturnToApp = () => {
      if (document.visibilityState !== 'visible') return
      const latestCustomerId = activeCustomer?.id
      if (!latestCustomerId) return
      const latestPayment = paymentStates[latestCustomerId]
      if (!latestPayment || latestPayment.status !== 'initiated') return
      setPaymentStates((prev) => ({
        ...prev,
        [latestCustomerId]: { ...latestPayment, status: 'verified' },
      }))
      setToast({
        type: 'success',
        message: 'Payment verified successfully. The customer status is now confirmed.',
      })
    }

    document.addEventListener('visibilitychange', handleReturnToApp)
    window.addEventListener('focus', handleReturnToApp)
    return () => {
      document.removeEventListener('visibilitychange', handleReturnToApp)
      window.removeEventListener('focus', handleReturnToApp)
    }
  }, [activeCustomer?.id, paymentStates])

  useEffect(() => {
    if (isDemoMode) {
      setBusiness(demoBusiness)
      setCustomers(demoCustomers)
      setTransactionsByCustomer(demoTransactions)
      setSelectedCustomerId(demoCustomers[0]?.id ?? null)
      return
    }

    if (loading) return

    if (!isAuthenticated) {
      if (screen !== 'developerIntro' && screen !== 'splash' && screen !== 'login' && screen !== 'register') {
        setScreen('splash')
      }
      return
    }

    if (!profile?.businessId) {
      setScreen('onboarding')
      return
    }

    if (screen === 'splash' || screen === 'login' || screen === 'register') {
      setScreen('dashboard')
    }
  }, [isDemoMode, loading, isAuthenticated, profile, screen])

  useEffect(() => {
    if (!isDemoMode) return
    window.localStorage.setItem('khatapro-demo-business', JSON.stringify(business ?? demoBusiness))
    window.localStorage.setItem('khatapro-demo-customers', JSON.stringify(customers))
    window.localStorage.setItem('khatapro-demo-transactions', JSON.stringify(transactionsByCustomer))
    window.localStorage.setItem('khatapro-profile', JSON.stringify(profileForm))
  }, [isDemoMode, business, customers, transactionsByCustomer, profileForm])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      })
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event)
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      setShowInstallButton(false)
      setIsStandaloneMode(true)
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const syncStandaloneState = () => setIsStandaloneMode(mediaQuery.matches)
    syncStandaloneState()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncStandaloneState)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(syncStandaloneState)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', syncStandaloneState)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(syncStandaloneState)
      }
    }
  }, [])

  useEffect(() => {
    if (!demoSession && !isAuthenticated) return
    if (screen !== 'dashboard') return

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    if (currentPath.startsWith('/loans')) return

    const loanState = JSON.parse(typeof window !== 'undefined' ? (window.localStorage.getItem('khatapro-loan-offer-state') ?? '{}') : '{}')
    const now = Date.now()
    const lastShownAt = Number(loanState.lastShownAt ?? 0)
    const dismissedAt = Number(loanState.dismissedAt ?? 0)

    if (lastShownAt && now - lastShownAt < 1000 * 60 * 60 * 24 * 7) {
      setLoanPopupVisible(false)
      return
    }

    if (dismissedAt && now - dismissedAt < 1000 * 60 * 60 * 24 * 7) {
      setLoanPopupVisible(false)
      return
    }

    void (async () => {
      const offers = await getAvailableLoanOffers(business?.id ?? 'demo-business')
      const nextOffer = offers[0] ?? demoLoanOffer
      setLoanOffer(nextOffer)
      setLoanOfferAmount(nextOffer.maxAmount)
      setLoanPopupVisible(true)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('khatapro-loan-offer-state', JSON.stringify({ ...loanState, lastShownAt: String(now) }))
      }
    })()
  }, [screen, demoSession, isAuthenticated, business?.id])

  const refreshCustomers = async () => {
    if (!profile?.businessId) {
      setCustomers([])
      setTransactionsByCustomer({})
      return
    }

    const customerData = await getCustomers(profile.businessId)
    const items = customerData.items
    const mapped: Record<string, CustomerTransaction[]> = {}

    for (const customer of items) {
      mapped[customer.id] = await getCustomerTransactions(profile.businessId, customer.id)
    }

    setCustomers(items)
    setTransactionsByCustomer(mapped)
    if (!selectedCustomerId && items[0]) {
      setSelectedCustomerId(items[0].id)
    }
  }

  useEffect(() => {
    if (isDemoMode) return
    if (!isAuthenticated || !currentUser || !profile || !profile.businessId) {
      setBusiness(null)
      return
    }

    const loadBusiness = async () => {
      const data = await getBusiness(profile.businessId)
      setBusiness(data)
      await refreshCustomers()
    }

    void loadBusiness()
  }, [currentUser, isAuthenticated, profile, isDemoMode])

  const handleLoanEligibilityCheck = async () => {
    const businessId = business?.id ?? 'demo-business'
    const result = await checkLoanEligibility(businessId)
    if (result.eligible && loanOffer) {
      setLoanOffer({ ...loanOffer, maxAmount: result.maxAmount, subtitle: `You may be eligible for up to ₹${result.maxAmount.toLocaleString('en-IN')}` })
      setLoanOfferAmount(result.maxAmount)
      setLoanPopupVisible(false)
      setScreen('loanDetail')
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/loans/${loanOffer.id}`)
      }
      if (currentUser) {
        void trackLoanOfferView(businessId, loanOffer.id, currentUser.uid)
      }
      return
    }

    setToast({ type: 'info', message: 'No active offer is available right now. Please check again later.' })
  }

  const handleLoanDismiss = () => {
    setLoanPopupVisible(false)
    if (typeof window !== 'undefined') {
      const current = JSON.parse(window.localStorage.getItem('khatapro-loan-offer-state') || '{}')
      window.localStorage.setItem('khatapro-loan-offer-state', JSON.stringify({ ...current, dismissedAt: String(Date.now()) }))
    }
  }

  const handleLoanOfferOpen = async (offer: LoanOffer = loanOffer ?? demoLoanOffer) => {
    const businessId = business?.id ?? 'demo-business'
    setLoanOffer(offer)
    setLoanOfferAmount(offer.maxAmount)
    setLoanForm((prev) => ({ ...prev, loanAmount: String(offer.maxAmount) }))
    setLoanPopupVisible(false)
    setScreen('loanDetail')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/loans/${offer.id}`)
    }
    if (currentUser) {
      void trackLoanOfferClick(businessId, offer.id, currentUser.uid)
    }
  }

  const handleLoanApply = async () => {
    const businessId = business?.id ?? 'demo-business'
    const requestedAmount = Number(loanForm.loanAmount || loanOfferAmount || 0)
    const payload: Omit<LoanApplication, 'id' | 'businessId' | 'status' | 'createdAt' | 'updatedAt'> = {
      userId: currentUser?.uid ?? 'demo-user',
      offerId: loanOffer?.id ?? demoLoanOffer.id,
      requestedAmount,
      provider: loanOffer?.providerName ?? 'KhataPro Capital',
      fullName: loanForm.fullName || profileForm.name || 'Business Owner',
      mobileNumber: loanForm.mobileNumber || profileForm.phone || '+91 00000 00000',
      businessName: loanForm.businessName || business?.name || demoBusiness.name,
      businessCategory: loanForm.businessCategory || business?.category || 'Retail',
      businessAddress: loanForm.businessAddress || business?.address || 'MG Road, Bangalore',
      purpose: loanForm.purpose || 'Working capital and expansion',
    }

    const application = await createLoanApplication(businessId, payload)
    setLoanApplication(application)
    setScreen('dashboard')
    setToast({ type: 'success', message: '✓ Application submitted. Your loan application is now under review.' })

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard')
    }

    await queueEmailNotification(businessId, {
      recipient: profileForm.email || 'support@khatapro.com',
      type: 'LOAN_APPLICATION_SUBMITTED',
      subject: 'Loan Application Received',
      status: 'queued',
      message: 'Your loan application has been received and is under review.',
    })
  }

  const handleAuthChange = (field: keyof typeof authForm, value: string) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isDemoMode) {
      if (authMode === 'register') {
        setDemoSession(false)
        setAuthForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
        setAuthMode('login')
        setToast({ type: 'success', message: '✓ Account created successfully. Please sign in and set up your business.' })
        setScreen('login')
        return
      }

      setDemoSession(true)
      setBusiness(demoBusiness)
      setCustomers(demoCustomers)
      setTransactionsByCustomer(demoTransactions)
      setScreen('dashboard')
      return
    }

    if (!isFirebaseConfigured) {
      setAuthError('Add your Firebase environment values before using signup or login.')
      return
    }

    if (authMode === 'register') {
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError('Passwords do not match.')
        return
      }
    }

    setAuthError('')
    setSubmitting(true)

    try {
      if (authMode === 'register') {
        await signUpUser({
          name: authForm.name,
          email: authForm.email,
          phone: authForm.phone,
          password: authForm.password,
        })

        setProfileForm((prev) => ({
          ...prev,
          name: authForm.name || prev.name,
          email: authForm.email || prev.email,
          phone: authForm.phone || prev.phone,
          photoURL: prev.photoURL || developerProfileImage,
        }))

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('khatapro-profile', JSON.stringify({
            ...demoProfile,
            name: authForm.name || demoProfile.name,
            email: authForm.email || demoProfile.email,
            phone: authForm.phone || demoProfile.phone,
            photoURL: developerProfileImage,
          }))
        }

        await signOutUser()

        setAuthForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
        setAuthMode('login')
        setToast({ type: 'success', message: `✓ Account created successfully. Please sign in and set up your business.` })
        setScreen('login')
      } else {
        await signInUser(authForm.email, authForm.password)
        setScreen('dashboard')
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOnboardingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentUser || !profile) return

    const form = new FormData(event.currentTarget)
    const businessName = String(form.get('businessName') || '')
    const category = String(form.get('category') || 'Retail')
    const address = String(form.get('address') || '')
    const city = String(form.get('city') || '')
    const state = String(form.get('state') || '')
    const currency = String(form.get('currency') || 'INR')

    if (!businessName.trim()) {
      setAuthError('Business name is required.')
      return
    }

    try {
      let businessLogoUrl = business?.logoUrl || ''

      if (businessLogoFile) {
        const fileExt = (businessLogoFile.name.split('.').pop() || 'png').toLowerCase()
        const storagePath = `business-logos/${currentUser.uid}/${Date.now()}.${fileExt}`
        businessLogoUrl = await storageService.uploadFile(businessLogoFile, storagePath)
      }

      const createdBusiness = await createBusiness({
        ownerId: currentUser.uid,
        name: businessName,
        category,
        address,
        city,
        state,
        country: 'India',
        currency,
        logoUrl: businessLogoUrl || undefined,
      })

      if (firebaseDb) {
        await setDoc(
          doc(firebaseDb, 'users', currentUser.uid),
          {
            ...profile,
            businessId: createdBusiness.id,
            onboardingCompleted: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
      }

      const nextBusiness = { ...createdBusiness, logoUrl: businessLogoUrl || undefined }
      setBusiness(nextBusiness)
      setBusinessLogoPreview(businessLogoUrl || '')
      setBusinessLogoFile(null)
      setScreen('dashboard')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Business onboarding failed.')
    }
  }

  const handleCustomerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!business?.id && !isDemoMode) return

    const payload = {
      id: `customer-${Date.now()}`,
      businessId: business?.id ?? 'demo-business',
      name: customerForm.name,
      phone: customerForm.phone,
      email: customerForm.email,
      address: customerForm.address,
      openingBalance: Number(customerForm.openingBalance || 0),
      openingBalanceType: customerForm.openingBalanceType,
      notes: customerForm.notes,
      status: 'active' as const,
    }

    if (isDemoMode) {
      const nextCustomers = [payload, ...customers]
      setCustomers(nextCustomers)
      setSelectedCustomerId(payload.id)
      setCustomerForm(emptyCustomerForm)
      setScreen('customers')
      return
    }

    const created = await createCustomer(business!.id, {
      name: customerForm.name,
      phone: customerForm.phone,
      email: customerForm.email,
      address: customerForm.address,
      openingBalance: Number(customerForm.openingBalance || 0),
      openingBalanceType: customerForm.openingBalanceType,
      notes: customerForm.notes,
      status: 'active',
    })

    await refreshCustomers()
    setSelectedCustomerId(created.id)
    setCustomerForm(emptyCustomerForm)
    setScreen('customers')
  }

  const handleTransactionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeCustomer) return

    const amount = Number(transactionForm.amount || 0)
    const newTx: CustomerTransaction = {
      id: `tx-${Date.now()}`,
      businessId: business?.id ?? 'demo-business',
      customerId: activeCustomer.id,
      type: transactionForm.type,
      amount,
      description: transactionForm.description || 'Khata entry',
      paymentMethod: transactionForm.paymentMethod,
      date: transactionForm.date,
      notes: transactionForm.notes,
    }

    if (isDemoMode) {
      const nextMap = {
        ...transactionsByCustomer,
        [activeCustomer.id]: [newTx, ...(transactionsByCustomer[activeCustomer.id] ?? [])],
      }
      setTransactionsByCustomer(nextMap)
      setPaymentSuccess({
        amount,
        type: transactionForm.type,
        reference: `TXN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      })
      setTransactionForm(emptyTransactionForm)
      setScreen('paymentSuccess')
      return
    }

    await createTransaction(business!.id, activeCustomer.id, {
      type: transactionForm.type,
      amount,
      description: transactionForm.description || 'Khata entry',
      paymentMethod: transactionForm.paymentMethod,
      date: transactionForm.date,
      notes: transactionForm.notes,
    })

    await refreshCustomers()
    setPaymentSuccess({
      amount,
      type: transactionForm.type,
      reference: `TXN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    })
    setTransactionForm(emptyTransactionForm)
    setScreen('paymentSuccess')
  }

  const handleCustomerPaymentLaunch = (customer: Customer, customAmount?: number) => {
    const baseBalance = computeCustomerBalance(customer, transactionsByCustomer[customer.id] ?? [])
    const outstanding = Math.max(baseBalance, 0)
    const amount = Math.min(Math.max(customAmount ?? outstanding, 0), outstanding || Number(customAmount ?? 0) || 0)
    const note = `KhataPro payment for ${customer.name} - ${business?.name ?? demoBusiness.name}`
    const reference = `KHATA-${customer.id}-${Date.now()}`
    const nextPayment: PaymentState = {
      status: 'initiated',
      amount,
      reference,
      note,
      customerId: customer.id,
      createdAt: new Date().toISOString(),
    }

    setPaymentStates((prev) => ({
      ...prev,
      [customer.id]: nextPayment,
    }))

    const upiLink = `upi://pay?pa=${encodeURIComponent(OWNER_UPI_ID)}&pn=${encodeURIComponent(business?.name ?? demoBusiness.name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}&mode=02`

    if (typeof window !== 'undefined') {
      const popup = window.open(upiLink, '_blank', 'noopener,noreferrer')
      if (!popup) {
        window.location.href = upiLink
      }
    }

    setToast({
      type: 'success',
      message: 'Payment initiated successfully. Please complete the UPI payment and return to confirm verification.',
    })
  }

  const handleInstallApp = async () => {
    if (!installPromptEvent) return

    installPromptEvent.prompt()
    const choice = await installPromptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setShowInstallButton(false)
    }
    setInstallPromptEvent(null)
  }

  const handleLogout = async () => {
    if (isDemoMode) {
      setDemoSession(false)
      setScreen('splash')
      return
    }
    await signOutUser()
    setScreen('login')
  }

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const nextUrl = String(reader.result ?? '')
      setProfileForm((prev) => ({ ...prev, photoURL: nextUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleBusinessLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    const maxSize = 2 * 1024 * 1024

    if (!validTypes.includes(file.type)) {
      setAuthError('Please upload a PNG, JPG, or WEBP business image.')
      return
    }

    if (file.size > maxSize) {
      setAuthError('Business image must be 2MB or smaller.')
      return
    }

    setAuthError('')
    setBusinessLogoFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      setBusinessLogoPreview(String(reader.result ?? ''))
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSave = () => {
    window.localStorage.setItem('khatapro-profile', JSON.stringify(profileForm))
    setScreen('dashboard')
  }

  const handleDeveloperIntroSkip = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('khatapro-has-seen-developer-intro', 'true')
    }
    setScreen('splash')
  }

  if (loading && !isDemoMode) {
    return (
      <div className="app-shell splash-shell">
        <div className="loading-card">
          <div className="brand-mark">
            <div className="brand-book">
              <span className="book-spine" />
              <span className="book-pages" />
            </div>
          </div>
          <h2>Khatapro</h2>
          <p>Loading your business…</p>
        </div>
      </div>
    )
  }

  if ((isDemoMode && !demoSession) || (!isDemoMode && !isAuthenticated)) {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-card">
          {screen === 'developerIntro' && <DeveloperIntroScreen onSkip={handleDeveloperIntroSkip} />}

          {screen === 'splash' && (
            <SplashScreen
              demoMode={isDemoMode}
              onGetStarted={() => {
                if (isDemoMode) {
                  setDemoSession(true)
                  setScreen('dashboard')
                  return
                }
                setAuthMode('register')
                setScreen('register')
              }}
              onLogin={() => {
                setAuthMode('login')
                setScreen('login')
              }}
            />
          )}

          {(screen === 'login' || screen === 'register') && (
            <AuthScreen
              mode={screen}
              form={authForm}
              error={authError}
              submitting={submitting}
              onModeChange={(nextMode) => {
                setAuthMode(nextMode)
                setScreen(nextMode)
              }}
              onFieldChange={handleAuthChange}
              onSubmit={handleAuthSubmit}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell-main">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">
            <div className="brand-book mini">
              <span className="book-spine" />
              <span className="book-pages" />
            </div>
          </div>
          <span>Khatapro</span>
        </div>

        <nav className="sidebar-nav">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'customers', label: 'Customers', icon: Users },
            { key: 'suppliers', label: 'Suppliers', icon: Building2 },
            { key: 'reports', label: 'Reports', icon: TrendingUp },
            { key: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${screen === item.key ? 'active' : ''}`}
              onClick={() => {
                if (item.key === 'settings') {
                  setSettingsOpen(true)
                  setActiveSettingsSection('profile')
                  return
                }
                setScreen(item.key as typeof screen)
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="logout-button" onClick={handleLogout}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      <main className="content-panel">
        {screen === 'onboarding' && (
          <OnboardingScreen
            onSubmit={handleOnboardingSubmit}
            error={authError}
            businessLogoPreview={businessLogoPreview}
            onBusinessLogoChange={handleBusinessLogoChange}
            onCancel={handleLogout}
          />
        )}

        {screen === 'dashboard' && (
          <DashboardScreen
            businessName={business?.name ?? demoBusiness.name}
            businessLogo={business?.logoUrl || businessLogoPreview || ''}
            customerName={profileForm.name || business?.name || demoProfile.name}
            summary={dashboardSummary}
            customers={customers}
            transactionsByCustomer={transactionsByCustomer}
            onAddCustomer={() => setScreen('addCustomer')}
            onAddTransaction={() => {
              if (customers[0]) {
                setSelectedCustomerId(customers[0].id)
                setTransactionForm({ ...emptyTransactionForm, type: 'given' })
                setScreen('addTransaction')
              }
            }}
            onViewCustomers={() => setScreen('customers')}
            onSelectCustomer={(customerId) => {
              setSelectedCustomerId(customerId)
              setScreen('khata')
            }}
            onOpenSettings={() => {
              setSettingsOpen(true)
              setActiveSettingsSection('profile')
            }}
            onLogout={handleLogout}
          />
        )}

        {screen === 'customers' && (
          <CustomersScreen
            customers={customers}
            transactionsByCustomer={transactionsByCustomer}
            onSelectCustomer={(customerId) => {
              setSelectedCustomerId(customerId)
              setScreen('khata')
            }}
            onAddCustomer={() => setScreen('addCustomer')}
            onBack={() => setScreen('dashboard')}
          />
        )}

        {screen === 'addCustomer' && (
          <CustomerFormScreen
            form={customerForm}
            onFieldChange={setCustomerForm}
            onCancel={() => setScreen('customers')}
            onSubmit={handleCustomerSubmit}
          />
        )}

        {screen === 'khata' && activeCustomer && (
          <KhataScreen
            customer={activeCustomer}
            transactions={activeCustomerTransactions}
            paymentStatus={paymentStates[activeCustomer.id] ?? null}
            paymentAmount={paymentDrafts[activeCustomer.id] ?? Math.max(computeCustomerBalance(activeCustomer, activeCustomerTransactions), 0)}
            businessName={business?.name ?? demoBusiness.name}
            onBack={() => setScreen('customers')}
            onAddGiven={() => {
              setTransactionForm({ ...emptyTransactionForm, type: 'given' })
              setScreen('addTransaction')
            }}
            onAddReceived={() => {
              setTransactionForm({ ...emptyTransactionForm, type: 'received' })
              setScreen('addTransaction')
            }}
            onSendReminder={() => setScreen('dashboard')}
            onPayNow={(amount) => {
              const nextAmount = Math.min(Math.max(amount, 0), Math.max(computeCustomerBalance(activeCustomer, activeCustomerTransactions), 0) || amount)
              setPaymentDrafts((prev) => ({ ...prev, [activeCustomer.id]: nextAmount }))
              handleCustomerPaymentLaunch(activeCustomer, nextAmount)
            }}
            onPayAllDue={() => {
              const due = Math.max(computeCustomerBalance(activeCustomer, activeCustomerTransactions), 0)
              setPaymentDrafts((prev) => ({ ...prev, [activeCustomer.id]: due }))
              handleCustomerPaymentLaunch(activeCustomer, due)
            }}
            onPaymentAmountChange={(amount) => {
              setPaymentDrafts((prev) => ({ ...prev, [activeCustomer.id]: Math.max(amount, 0) }))
            }}
          />
        )}

        {screen === 'addTransaction' && activeCustomer && (
          <TransactionFormScreen
            customerName={activeCustomer.name}
            form={transactionForm}
            onFieldChange={setTransactionForm}
            onCancel={() => setScreen('khata')}
            onSubmit={handleTransactionSubmit}
          />
        )}

        {screen === 'suppliers' && <PlaceholderScreen title="Suppliers" description="Supplier management and supplier khata will be connected here using Firebase." />}
        {screen === 'reports' && <PlaceholderScreen title="Reports" description="Real Firebase totals and charts will appear here with date filters." />}
        {screen === 'profile' && (
          <ProfileScreen
            profile={profileForm}
            businessName={business?.name ?? demoBusiness.name}
            onImageChange={handleProfileImageChange}
            onFieldChange={setProfileForm}
            onSave={handleProfileSave}
            onBack={() => setScreen('dashboard')}
          />
        )}
        {screen === 'paymentSuccess' && (
          <PaymentSuccessScreen
            amount={paymentSuccess?.amount ?? 0}
            type={paymentSuccess?.type ?? 'given'}
            reference={paymentSuccess?.reference ?? 'TXN-0000000000'}
            onDone={() => {
              setPaymentSuccess(null)
              setScreen('khata')
            }}
          />
        )}
        {screen === 'about' && (
          <AboutKahaBookScreen
            onBack={() => setScreen('settings')}
            onOpenDeveloper={() => setScreen('developerProfile')}
          />
        )}
        {screen === 'developerProfile' && (
          <DeveloperProfileScreen onBack={() => setScreen('settings')} />
        )}
        {screen === 'loans' && (
          <LoanOfferListScreen
            businessName={business?.name ?? demoBusiness.name}
            offer={loanOffer ?? demoLoanOffer}
            onOpenOffer={() => handleLoanOfferOpen(loanOffer ?? demoLoanOffer)}
            onBack={() => {
              setScreen('dashboard')
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard')
              }
            }}
          />
        )}
        {screen === 'loanDetail' && (
          <LoanDetailScreen
            offer={loanOffer ?? demoLoanOffer}
            selectedAmount={loanOfferAmount}
            tenure={loanTenure}
            onSelectAmount={setLoanOfferAmount}
            onSelectTenure={setLoanTenure}
            onBack={() => {
              setScreen('dashboard')
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/dashboard')
              }
            }}
            onContinue={() => {
              setScreen('loanApplication')
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/loans/${(loanOffer ?? demoLoanOffer).id}`)
              }
            }}
          />
        )}
        {screen === 'loanApplication' && (
          <LoanApplicationScreen
            form={loanForm}
            businessName={business?.name ?? demoBusiness.name}
            amount={loanOfferAmount}
            tenure={loanTenure}
            onFieldChange={setLoanForm}
            onBack={() => {
              setScreen('loanDetail')
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', `/loans/${(loanOffer ?? demoLoanOffer).id}`)
              }
            }}
            onSubmit={async (event) => {
              event.preventDefault()
              await handleLoanApply()
            }}
          />
        )}
      </main>

      {loanPopupVisible && loanOffer && (
        <LoanOfferPopup
          offer={loanOffer}
          onClose={handleLoanDismiss}
          onCheckEligibility={() => {
            void handleLoanEligibilityCheck()
          }}
        />
      )}

      {toast && <div className={`floating-toast ${toast.type}`}>{toast.message}</div>}

      {!isStandaloneMode && showInstallButton && (
        <button type="button" className="install-app-button" onClick={handleInstallApp}>
          Install KhataPro App
        </button>
      )}

      <SettingsDrawer
        open={settingsOpen}
        activeSection={activeSettingsSection}
        onSelectSection={(section) => setActiveSettingsSection(section)}
        onClose={() => setSettingsOpen(false)}
        onOpenAbout={() => {
          setScreen('about')
          setSettingsOpen(false)
        }}
        onOpenDeveloper={() => {
          setScreen('developerProfile')
          setSettingsOpen(false)
        }}
        profileForm={profileForm}
        onProfileChange={setProfileForm}
        onProfileSave={() => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('khatapro-profile', JSON.stringify(profileForm))
          }
          setSettingsFeedback({ type: 'success', message: 'Profile updated successfully.' })
        }}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)}
        compactLayout={compactLayout}
        onToggleCompactLayout={() => setCompactLayout((prev) => !prev)}
        onLogout={async () => {
          if (window.confirm('Are you sure you want to logout?')) {
            await signOutUser()
            setScreen('login')
            setAuthMode('login')
            setSettingsOpen(false)
            setToast({ type: 'success', message: 'You have been logged out.' })
          }
        }}
      />

      <nav className="mobile-bottom-nav">
        {[
          { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { key: 'customers', label: 'Customers', icon: Users },
          { key: 'addCustomer', label: '+', icon: Plus, special: true },
          { key: 'suppliers', label: 'Suppliers', icon: Building2 },
          { key: 'reports', label: 'Reports', icon: TrendingUp },
          { key: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`mobile-nav-item ${item.special ? 'special' : ''}`}
            onClick={() => {
              if (item.key === 'addCustomer') {
                setScreen('addCustomer')
                return
              }
              if (item.key === 'settings') {
                setSettingsOpen(true)
                setActiveSettingsSection('profile')
                return
              }
              setScreen(item.key as typeof screen)
            }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const demoBusiness: Business = {
  id: 'demo-business',
  ownerId: 'demo-user',
  name: 'Manish Kumar Yadav Traders',
  category: 'Retail',
  address: 'MG Road',
  city: 'Bangalore',
  state: 'Karnataka',
  country: 'India',
  currency: 'INR',
}

const demoProfile = {
  uid: 'demo-user',
  name: DEFAULT_PROFILE_NAME,
  email: 'manish25er@gmail.com',
  phone: '+91 62830 92662',
  photoURL: developerProfileImage,
  businessId: 'demo-business',
  onboardingCompleted: true,
}

const demoCustomers: Customer[] = [
  { id: 'cust-rahul', businessId: 'demo-business', name: 'Rahul Sharma', phone: '+91 98765 11223', email: 'rahul@example.com', address: 'Koramangala', openingBalance: 5000, openingBalanceType: 'receivable', status: 'active' },
  { id: 'cust-meena', businessId: 'demo-business', name: 'Meena Stores', phone: '+91 99887 76543', email: 'meena@example.com', address: 'Indiranagar', openingBalance: 1800, openingBalanceType: 'payable', status: 'active' },
  { id: 'cust-nisha', businessId: 'demo-business', name: 'Nisha Fashion', phone: '+91 98200 33221', email: 'nisha@example.com', address: 'HSR Layout', openingBalance: 0, openingBalanceType: 'settled', status: 'active' },
]

const demoTransactions: Record<string, CustomerTransaction[]> = {
  'cust-rahul': [
    { id: 'tx-1', businessId: 'demo-business', customerId: 'cust-rahul', type: 'given', amount: 5000, description: 'Fabric stock', paymentMethod: 'cash', date: '2026-10-01' },
    { id: 'tx-2', businessId: 'demo-business', customerId: 'cust-rahul', type: 'received', amount: 2000, description: 'Advance payment', paymentMethod: 'upi', date: '2026-10-04' },
  ],
  'cust-meena': [
    { id: 'tx-3', businessId: 'demo-business', customerId: 'cust-meena', type: 'received', amount: 1200, description: 'Payment received', paymentMethod: 'bank_transfer', date: '2026-10-03' },
  ],
  'cust-nisha': [
    { id: 'tx-4', businessId: 'demo-business', customerId: 'cust-nisha', type: 'given', amount: 2500, description: 'Order supply', paymentMethod: 'cash', date: '2026-10-06' },
    { id: 'tx-5', businessId: 'demo-business', customerId: 'cust-nisha', type: 'received', amount: 2500, description: 'Full settlement', paymentMethod: 'upi', date: '2026-10-07' },
  ],
}

function DeveloperIntroScreen({
  onSkip,
}: {
  onSkip: () => void
}) {
  const introSlides = [
    { title: 'Er. Manish Kumar Yadav', role: 'Software Engineer', description: 'Building modern fintech experiences that make business operations smarter, faster, and more reliable.', highlights: ['Finance', 'Business', 'Growth'] },
    { title: 'KhataPro', role: 'Digital Business Management', description: 'Track customers, payments, balances, and business activity from a clean mobile dashboard that keeps your work organized.', highlights: ['Khata', 'Finance', 'Dashboard'] },
    { title: 'Smart Ledger', role: 'Daily Control', description: 'Stay in control of receivables, dues, and billing records with a simple flow designed for real business use.', highlights: ['Records', 'Insights', 'Trust'] },
    { title: 'Welcome to KhataPro', role: 'Let’s Begin', description: 'Your digital business management app is ready to help you run and grow your business with confidence.', highlights: ['Launch App', 'Manage Smartly', 'Grow Faster'] },
  ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const isLastSlide = currentIndex === introSlides.length - 1

  const handlePrimaryAction = () => {
    if (isLastSlide) {
      onSkip()
      return
    }

    setCurrentIndex((prev) => prev + 1)
  }

  const activeSlide = introSlides[currentIndex]
  const progressWidth = `${((currentIndex + 1) / introSlides.length) * 100}%`
  const isFirstSlide = currentIndex === 0

  return (
    <div className="developer-intro-screen">
      <div className={`developer-intro-card ${isFirstSlide ? 'developer-intro-card--first' : ''}`}>
        <div className="intro-progress-bar" aria-hidden="true">
          <span style={{ width: progressWidth }} />
        </div>

        {!isFirstSlide && <p className="developer-intro-kicker">Step {currentIndex + 1} / {introSlides.length}</p>}

        <div className={`developer-profile-card ${isFirstSlide ? 'developer-profile-card--first developer-profile-card--solo' : ''}`}>
          <div className="developer-avatar-wrap">
            <img src={developerProfileImage} alt="Er. Manish Kumar Yadav" className="developer-profile-image" />
          </div>

          {!isFirstSlide && <h2>{activeSlide.title}</h2>}

          {!isFirstSlide && (
            <div className="developer-role">
              <span className="developer-role-icon">✓</span>
              <span>{activeSlide.role}</span>
            </div>
          )}

          {!isFirstSlide && <p className="developer-tagline">{activeSlide.description}</p>}

          {isFirstSlide && (
            <div className="first-intro-hero">
              <div className="first-intro-bookmark" aria-hidden="true">
                <div className="brand-book intro-brand-book">
                  <span className="book-spine" />
                  <span className="book-pages" />
                </div>
              </div>
              <div className="developer-intro-brand-badge">KhataPro</div>
              <p className="developer-intro-splash-copy">Digital Business Management</p>
              <div className="first-intro-meta">
                <span>Er. Manish Kumar Yadav</span>
                <small>Software Engineer</small>
              </div>
            </div>
          )}
        </div>

        {!isFirstSlide && (
          <div className="feature-grid">
            {activeSlide.highlights.map((item) => (
              <span key={item} className="feature-pill">{item}</span>
            ))}
          </div>
        )}

        {!isFirstSlide && (
          <div className="developer-branding">
            <div className="developer-divider" />
            <p className="developer-introducing">Introducing</p>
            <h3>KhataPro</h3>
            <p className="developer-subtitle">Digital Business Management</p>
          </div>
        )}

        {!isFirstSlide && (
          <div className="developer-intro-footer">
            <span>© 2026 KhataPro</span>
            <small>Developed by Manish Kumar</small>
          </div>
        )}

        <div className="intro-actions">
          <button type="button" className="text-link intro-skip" onClick={onSkip}>Skip</button>
          <button type="button" className="primary-button intro-next-button" onClick={handlePrimaryAction}>
            {isLastSlide ? 'Start KhataPro' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SplashScreen({
  onGetStarted,
  onLogin,
  demoMode,
}: {
  onGetStarted: () => void
  onLogin: () => void
  demoMode?: boolean
}) {
  return (
    <div className="screen splash-screen mobile-splash-screen animated fade-up">
      <div className="mobile-app-frame">
        <div className="mobile-app-screen splash-exact-screen">
          <div className="mobile-statusbar splash-statusbar">
            <span>9:41</span>
            <div className="mobile-status-icons" aria-hidden="true">
              <span className="mobile-signal" />
              <span className="mobile-wifi" />
              <span className="mobile-battery" />
            </div>
          </div>

          <div className="splash-book-wrap">
            <div className="brand-book splash-brand-book">
              <span className="book-spine" />
              <span className="book-pages" />
            </div>
          </div>

          <h1 className="splash-title">KahaBook</h1>
          <p className="splash-subtitle">Digital Business Management</p>

          <div className="splash-metrics" aria-label="Business metrics preview">
            <div className="metric-card">
              <span className="metric-bars metric-bars--one" />
              <span className="metric-bars metric-bars--two" />
              <span className="metric-bars metric-bars--three" />
            </div>
            <div className="metric-card metric-card--active">
              <span className="metric-line metric-line--one" />
              <span className="metric-line metric-line--two" />
              <span className="metric-line metric-line--three" />
            </div>
            <div className="metric-card">
              <span className="metric-circle" />
              <span className="metric-square" />
            </div>
          </div>

          <div className="splash-progress-wrap" aria-label="Loading app">
            <div className="splash-progress-bar" />
          </div>

          <div className="splash-bottom-row">
            <button type="button" className="primary-button wide-button splash-primary-button" onClick={onGetStarted}>
              {demoMode ? 'Try Demo' : 'Get Started'}
            </button>
            <button type="button" className="text-link login-link splash-login-link" onClick={onLogin}>
              Login
            </button>
          </div>

          <div className="splash-status">Setting things up ...</div>
        </div>
      </div>
    </div>
  )
}

function AuthScreen({
  mode,
  form,
  error,
  submitting,
  onModeChange,
  onFieldChange,
  onSubmit,
}: {
  mode: 'login' | 'register'
  form: { name: string; email: string; phone: string; password: string; confirmPassword: string }
  error: string
  submitting: boolean
  onModeChange: (mode: 'login' | 'register') => void
  onFieldChange: (field: keyof typeof form, value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}) {
  return (
    <div className="screen auth-screen auth-screen-reference fade-up">
      <div className="auth-brand-row">
        <div className="auth-brand-icon">
          <div className="brand-mark small">
            <div className="brand-book mini">
              <span className="book-spine" />
              <span className="book-pages" />
            </div>
          </div>
        </div>
        <span className="auth-brand-name">Khatapro</span>
      </div>

      <div className="auth-subtitle">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
      <h3 className="auth-hero-heading">{mode === 'login' ? 'Sign in to KhataPro' : 'Join KhataPro'}</h3>

      <div className="auth-toggle">
        <button
          type="button"
          className={`auth-toggle-option ${mode === 'login' ? 'active' : ''}`}
          onClick={() => onModeChange('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`auth-toggle-option ${mode === 'register' ? 'active' : ''}`}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {mode === 'register' && (
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={form.name}
              placeholder="e.g. Rahul Sharma"
              onChange={(event) => onFieldChange('name', event.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            value={form.email}
            placeholder="manish23@gmail.com"
            onChange={(event) => onFieldChange('email', event.target.value)}
          />
        </label>

        {mode === 'register' && (
          <label className="field">
            <span>Mobile number</span>
            <input
              type="tel"
              value={form.phone}
              placeholder="Enter mobile number"
              onChange={(event) => onFieldChange('phone', event.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            placeholder={mode === 'login' ? '••••••' : 'Create password'}
            onChange={(event) => onFieldChange('password', event.target.value)}
          />
        </label>

        {mode === 'register' && (
          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              value={form.confirmPassword}
              placeholder="Confirm password"
              onChange={(event) => onFieldChange('confirmPassword', event.target.value)}
            />
          </label>
        )}

        {error && <div className="error-banner">{error}</div>}

        <button type="submit" className="primary-button wide-button auth-submit-button" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

function OnboardingScreen({
  onSubmit,
  error,
  businessLogoPreview,
  onBusinessLogoChange,
  onCancel,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  error: string
  businessLogoPreview: string
  onBusinessLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onCancel: () => void
}) {
  const previewInitials = 'B'
  return (
    <div className="screen onboarding-screen fade-up">
      <div className="flow-steps">
        <span className="step active" />
        <span className="step" />
      </div>

      <div className="screen-title-block">
        <div className="tiny-brand">Khatapro</div>
        <h3>Set up your business</h3>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Business Name</span>
          <input name="businessName" type="text" placeholder="Enter business name" />
        </label>

        <label className="field">
          <span>Business logo (optional)</span>
          <div className="business-logo-upload-box">
            {businessLogoPreview ? (
              <img src={businessLogoPreview} alt="Business logo preview" className="business-logo-preview-image" />
            ) : (
              <div className="business-logo-placeholder">{previewInitials}</div>
            )}
            <span>{businessLogoPreview ? 'Change logo' : 'Upload logo'}</span>
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onBusinessLogoChange} className="business-logo-input" />
        </label>

        <label className="field">
          <span>Business Category</span>
          <select name="category" defaultValue="Retail">
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Services">Services</option>
          </select>
        </label>

        <label className="field">
          <span>Address</span>
          <input name="address" type="text" placeholder="Enter address" />
        </label>

        <div className="multi-field">
          <label className="field">
            <span>City</span>
            <input name="city" type="text" placeholder="City" />
          </label>
          <label className="field">
            <span>State</span>
            <input name="state" type="text" placeholder="State" />
          </label>
        </div>

        <label className="field">
          <span>Currency</span>
          <select name="currency" defaultValue="INR">
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
          </select>
        </label>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary-button">Continue</button>
        </div>
      </form>
    </div>
  )
}

function SettingsShowcaseScreen({
  onOpenAbout,
  onOpenDeveloper,
}: {
  onOpenAbout: () => void
  onOpenDeveloper: () => void
}) {
  const settingsRows = [
    { icon: User, label: 'Business Profile', subtitle: 'Manage your business details' },
    { icon: CreditCard, label: 'Billing & Subscription', subtitle: 'Manage your plan' },
    { icon: Bell, label: 'Notifications', subtitle: 'Alert and update preferences' },
    { icon: ShieldCheck, label: 'Security & Privacy', subtitle: 'App lock, data backup' },
    { icon: Globe, label: 'Language', subtitle: 'English (India)' },
    { icon: Settings, label: 'App Preferences', subtitle: 'Customize your experience' },
    { icon: CircleHelp, label: 'Help & Support', subtitle: 'FAQs and contact us' },
    { icon: Info, label: 'About KahaBook', subtitle: 'App info, developer, version', highlighted: true },
  ]

  const bottomTabs = [
    { label: 'Home' },
    { label: 'Invoices' },
    { label: 'Inventory' },
    { label: 'Customers' },
    { label: 'More', active: true },
  ]

  return (
    <div className="showcase-flow-shell">
      <div className="showcase-flow-head">
        <span>Settings flow</span>
      </div>

      <div className="showcase-rail">
        <div className="demo-phone-card settings-demo-card">
          <div className="mobile-header green-header">
            <button type="button" className="mobile-nav-button" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <span>Settings</span>
            <span className="header-spacer" />
          </div>

          <div className="settings-list">
            {settingsRows.map(({ icon: Icon, label, subtitle, highlighted }) => (
              <button
                key={label}
                type="button"
                className={`settings-row ${highlighted ? 'highlighted' : ''}`}
                onClick={highlighted ? onOpenAbout : undefined}
              >
                <span className="settings-icon"><Icon size={18} /></span>
                <span className="settings-copy">
                  <strong>{label}</strong>
                  <small>{subtitle}</small>
                </span>
                <span className="settings-arrow"><ChevronRight size={18} /></span>
              </button>
            ))}
          </div>

          <div className="demo-nav-bar">
            {bottomTabs.map(({ label, active }) => (
              <button type="button" key={label} className={`demo-nav-item ${active ? 'active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="showcase-arrow"><ArrowRight size={16} /></div>

        <div className="demo-phone-card about-demo-card">
          <div className="mobile-header green-header">
            <button type="button" className="mobile-nav-button" aria-label="Back" onClick={onOpenAbout}>
              <ArrowLeft size={18} />
            </button>
            <span>About KahaBook</span>
            <span className="header-spacer" />
          </div>

          <div className="about-hero-card">
            <div className="brand-mark large mint-mark">
              <div className="brand-book">
                <span className="book-spine" />
                <span className="book-pages" />
              </div>
            </div>
            <h3>KahaBook</h3>
            <p>Simple Accounting<br />for Your Business</p>
          </div>

          <div className="about-info-list">
            <div className="about-info-row">
              <span className="info-icon"><FileText size={16} /></span>
              <span className="info-copy">
                <strong>App Version</strong>
                <small>1.0.0</small>
              </span>
            </div>
            <div className="about-info-row">
              <span className="info-icon"><FileText size={16} /></span>
              <span className="info-copy">
                <strong>What&apos;s New</strong>
                <small>See latest updates</small>
              </span>
            </div>
            <div className="about-info-row selected-row" onClick={onOpenDeveloper} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenDeveloper() }}>
              <span className="info-icon"><User size={16} /></span>
              <span className="info-copy">
                <strong>Developer</strong>
                <small>Meet the developer</small>
              </span>
            </div>
            <div className="about-info-row">
              <span className="info-icon"><ShieldCheck size={16} /></span>
              <span className="info-copy">
                <strong>Privacy Policy</strong>
                <small>Read our privacy policy</small>
              </span>
            </div>
            <div className="about-info-row">
              <span className="info-icon"><FileText size={16} /></span>
              <span className="info-copy">
                <strong>Terms &amp; Conditions</strong>
                <small>Read our terms</small>
              </span>
            </div>
            <div className="about-info-row">
              <span className="info-icon"><Star size={16} /></span>
              <span className="info-copy">
                <strong>Rate Us</strong>
                <small>Support us on Play Store</small>
              </span>
            </div>
          </div>
        </div>

        <div className="showcase-arrow"><ArrowRight size={16} /></div>

        <div className="demo-phone-card developer-demo-card">
          <div className="mobile-header green-header">
            <button type="button" className="mobile-nav-button" aria-label="Back" onClick={onOpenAbout}>
              <ArrowLeft size={18} />
            </button>
            <span>Developer</span>
            <span className="header-spacer" />
          </div>

          <div className="developer-profile-card-demo">
            <div className="developer-avatar-frame">
              <img src={developerProfileImage} alt="Er. Manish Kumar" className="developer-demo-photo" />
            </div>
            <div className="developer-bio-label">Developed by</div>
            <h4>Er. Manish Kumar</h4>
            <p>Full Stack Developer</p>
          </div>

          <div className="mini-quote-card">
            Building simple and powerful business solutions like KahaBook.
          </div>

          <div className="contact-card">
            <div className="contact-row">
              <span className="contact-icon"><Phone size={16} /></span>
              <div>
                <strong>Phone</strong>
                <a href="tel:+916283092662" target="_self" rel="noreferrer">+91 62830 92662</a>
              </div>
            </div>
            <div className="contact-row">
              <span className="contact-icon"><Mail size={16} /></span>
              <div>
                <strong>Email</strong>
                <a href="mailto:manish25er@gmail.com">manish25er@gmail.com</a>
              </div>
            </div>
            <div className="contact-row">
              <span className="contact-icon"><Globe size={16} /></span>
              <div>
                <strong>Website</strong>
                <a href="https://roomspot.manish25er.workers.dev/portfolio" target="_blank" rel="noreferrer">roomspot.manish25er.workers.dev/portfolio</a>
              </div>
            </div>
            <div className="contact-row">
              <span className="contact-icon"><Users size={16} /></span>
              <div>
                <strong>LinkedIn</strong>
                <a href="https://linkedin.com/in/yourprofile" target="_blank" rel="noreferrer">linkedin.com/in/yourprofile</a>
              </div>
            </div>
            <div className="contact-row">
              <span className="contact-icon"><MapPin size={16} /></span>
              <div><strong>Location</strong><small>India</small></div>
            </div>
          </div>

          <div className="quote-card">
            <span className="quote-mark">“</span>
            <p>Passionate about building simple, reliable and user-friendly applications for businesses.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

type SettingsSection = 'profile' | 'developer' | 'appearance' | 'language' | 'notifications' | 'privacy' | 'preferences' | 'support' | 'about' | 'logout'

function SettingsDrawer({
  open,
  activeSection,
  onSelectSection,
  onClose,
  onOpenAbout,
  onOpenDeveloper,
  profileForm,
  onProfileChange,
  onProfileSave,
  themeMode,
  onThemeChange,
  selectedLanguage,
  onLanguageChange,
  notificationsEnabled,
  onToggleNotifications,
  compactLayout,
  onToggleCompactLayout,
  onLogout,
}: {
  open: boolean
  activeSection: SettingsSection
  onSelectSection: (section: SettingsSection) => void
  onClose: () => void
  onOpenAbout: () => void
  onOpenDeveloper: () => void
  profileForm: typeof demoProfile
  onProfileChange: React.Dispatch<React.SetStateAction<typeof demoProfile>>
  onProfileSave: () => void
  themeMode: 'light' | 'dark' | 'system'
  onThemeChange: (value: 'light' | 'dark' | 'system') => void
  selectedLanguage: 'en' | 'hi'
  onLanguageChange: (value: 'en' | 'hi') => void
  notificationsEnabled: boolean
  onToggleNotifications: () => void
  compactLayout: boolean
  onToggleCompactLayout: () => void
  onLogout: () => void
}) {
  const menuItems = [
    { key: 'profile', label: 'My Profile', icon: UserRound, description: 'Account details' },
    { key: 'developer', label: 'Developer Profile', icon: Code2, description: 'App credits' },
    { key: 'appearance', label: 'Appearance & Theme', icon: Palette, description: 'Light / dark / system' },
    { key: 'language', label: 'Language', icon: Languages, description: 'English / Hindi' },
    { key: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts and reminders' },
    { key: 'privacy', label: 'Privacy & Security', icon: ShieldCheck, description: 'Account protection' },
    { key: 'preferences', label: 'App Preferences', icon: SlidersHorizontal, description: 'Layout and behavior' },
    { key: 'support', label: 'Help & Support', icon: CircleHelp, description: 'FAQs and contacts' },
    { key: 'about', label: 'About KhataPro', icon: Info, description: 'Application details' },
    { key: 'logout', label: 'Logout', icon: LogOut, description: 'Sign out securely' },
  ] as const

  const settingsFeedback = null

  const handleProfilePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const nextUrl = String(reader.result ?? '')
      onProfileChange((prev) => ({ ...prev, photoURL: nextUrl }))
    }
    reader.readAsDataURL(file)
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge">
                <UserRound size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Account</p>
                <h3>My Profile</h3>
              </div>
            </div>

            <div className="profile-edit-card">
              <label className="profile-avatar-upload settings-avatar-upload" htmlFor="settings-profile-upload">
                <div className="profile-avatar-preview">
                  <img src={profileForm.photoURL} alt="Profile" />
                </div>
                <span>Upload photo</span>
                <input id="settings-profile-upload" type="file" accept="image/*" onChange={handleProfilePhotoUpload} />
              </label>
              <div className="settings-form-grid">
                <label className="settings-field">
                  <span>Full name</span>
                  <input value={profileForm.name} onChange={(event) => onProfileChange((prev) => ({ ...prev, name: event.target.value }))} />
                </label>
                <label className="settings-field">
                  <span>Email</span>
                  <input type="email" value={profileForm.email} onChange={(event) => onProfileChange((prev) => ({ ...prev, email: event.target.value }))} />
                </label>
                <label className="settings-field">
                  <span>Phone</span>
                  <input value={profileForm.phone} onChange={(event) => onProfileChange((prev) => ({ ...prev, phone: event.target.value }))} />
                </label>
                <label className="settings-field">
                  <span>Photo URL</span>
                  <input value={profileForm.photoURL} onChange={(event) => onProfileChange((prev) => ({ ...prev, photoURL: event.target.value }))} />
                </label>
              </div>
            </div>

            <div className="settings-actions-row">
              <button type="button" className="secondary-button" onClick={onClose}>Close</button>
              <button type="button" className="primary-button" onClick={onProfileSave}>Save Profile</button>
            </div>
          </div>
        )

      case 'developer':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge tech">
                <Code2 size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Developer</p>
                <h3>Developer Profile</h3>
              </div>
            </div>

            <div className="developer-card settings-card">
              <div className="developer-avatar-ring">
                <img src={developerProfileImage} alt="Er. Manish Kumar" />
              </div>
              <div className="developer-meta-stack">
                <span className="developer-badge">Developed by</span>
                <h4>Er. Manish Kumar Yadav</h4>
                <p>Designed this Khatabook</p>
              </div>
            </div>

            <div className="settings-box-list">
              <div className="settings-box-row">
                <span className="settings-box-icon"><Phone size={16} /></span>
                <div>
                  <strong>Phone</strong>
                  <a href="tel:+916283092662">+91 62830 92662</a>
                </div>
              </div>
              <div className="settings-box-row">
                <span className="settings-box-icon"><Mail size={16} /></span>
                <div>
                  <strong>Email</strong>
                  <a href="mailto:manish25er@gmail.com">manish25er@gmail.com</a>
                </div>
              </div>
              <div className="settings-box-row">
                <span className="settings-box-icon"><Globe size={16} /></span>
                <div>
                  <strong>Portfolio</strong>
                  <a href="https://roomspot.manish25er.workers.dev/portfolio" target="_blank" rel="noreferrer">roomspot.manish25er.workers.dev/portfolio</a>
                </div>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge theme">
                <Palette size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Customize</p>
                <h3>Appearance & Theme</h3>
              </div>
            </div>

            <div className="theme-options">
              {(['light', 'dark', 'system'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`theme-option ${themeMode === option ? 'selected' : ''}`}
                  onClick={() => onThemeChange(option)}
                >
                  <span className="theme-option-label">{option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System default'}</span>
                  {themeMode === option && <Check size={16} />}
                </button>
              ))}
            </div>

            <div className="settings-preview-card">
              <div className="preview-window">
                <div className="preview-bar" />
                <div className="preview-cards">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        )

      case 'language':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge language">
                <Languages size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Preferences</p>
                <h3>Language</h3>
              </div>
            </div>

            <div className="theme-options vertical">
              {(['en', 'hi'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`theme-option ${selectedLanguage === option ? 'selected' : ''}`}
                  onClick={() => onLanguageChange(option)}
                >
                  <span className="theme-option-label">{option === 'en' ? 'English' : 'हिन्दी'}</span>
                  {selectedLanguage === option && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge notification">
                <Bell size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Alerts</p>
                <h3>Notifications</h3>
              </div>
            </div>

            <div className="settings-toggle-card">
              <div>
                <strong>Push & reminders</strong>
                <small>Receive reminders, payment alerts, and updates.</small>
              </div>
              <button type="button" className={`switch-toggle ${notificationsEnabled ? 'on' : ''}`} onClick={onToggleNotifications} aria-label="Toggle notifications">
                <span />
              </button>
            </div>
          </div>
        )

      case 'privacy':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge privacy">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Security</p>
                <h3>Privacy & Security</h3>
              </div>
            </div>

            <div className="settings-box-list">
              <div className="settings-box-row">
                <span className="settings-box-icon"><ShieldCheck size={16} /></span>
                <div>
                  <strong>Account protection</strong>
                  <small>Protected using Firebase authentication and secure app sessions.</small>
                </div>
              </div>
              <div className="settings-box-row muted">
                <span className="settings-box-icon"><Lock size={16} /></span>
                <div>
                  <strong>Password change</strong>
                  <small>Managed via Firebase account settings when supported by your authentication provider.</small>
                </div>
              </div>
            </div>
          </div>
        )

      case 'preferences':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge pref">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Layout</p>
                <h3>App Preferences</h3>
              </div>
            </div>

            <div className="settings-toggle-card">
              <div>
                <strong>Compact layout</strong>
                <small>Reduce spacing for smaller mobile screens.</small>
              </div>
              <button type="button" className={`switch-toggle ${compactLayout ? 'on' : ''}`} onClick={onToggleCompactLayout} aria-label="Toggle compact layout">
                <span />
              </button>
            </div>
          </div>
        )

      case 'support':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge support">
                <CircleHelp size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Support</p>
                <h3>Help & Support</h3>
              </div>
            </div>

            <div className="settings-box-list">
              <div className="settings-box-row">
                <span className="settings-box-icon"><Mail size={16} /></span>
                <div>
                  <strong>Email support</strong>
                  <a href="mailto:manish25er@gmail.com">manish25er@gmail.com</a>
                </div>
              </div>
              <div className="settings-box-row">
                <span className="settings-box-icon"><Globe size={16} /></span>
                <div>
                  <strong>Portfolio</strong>
                  <a href="https://roomspot.manish25er.workers.dev/portfolio" target="_blank" rel="noreferrer">roomspot.manish25er.workers.dev/portfolio</a>
                </div>
              </div>
            </div>
          </div>
        )

      case 'about':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge about">
                <Info size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Information</p>
                <h3>About KhataPro</h3>
              </div>
            </div>

            <div className="about-summary-card">
              <div className="brand-mark small">
                <div className="brand-book mini">
                  <span className="book-spine" />
                  <span className="book-pages" />
                </div>
              </div>
              <h4>KhataPro</h4>
              <p>Digital Business Management</p>
              <small>Version 1.0.0</small>
            </div>

            <div className="settings-box-list">
              <div className="settings-box-row">
                <span className="settings-box-icon"><FileText size={16} /></span>
                <div>
                  <strong>App purpose</strong>
                  <small>Track customers, payments, balances, and daily business activity.</small>
                </div>
              </div>
              <div className="settings-box-row">
                <span className="settings-box-icon"><UserRound size={16} /></span>
                <div>
                  <strong>Developer</strong>
                  <button type="button" className="text-link inline" onClick={() => onSelectSection('developer')}>View developer profile</button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'logout':
        return (
          <div className="settings-panel-section">
            <div className="settings-hero">
              <div className="settings-hero-badge logout">
                <LogOut size={18} />
              </div>
              <div>
                <p className="settings-eyebrow">Session</p>
                <h3>Logout</h3>
              </div>
            </div>

            <div className="settings-warning-card">
              <p>Are you sure you want to sign out from KhataPro?</p>
              <button type="button" className="primary-button danger" onClick={onLogout}>Log out</button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <div className={`settings-overlay ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden={!open} />
      <aside className={`settings-drawer ${open ? 'open' : ''}`} aria-label="Settings panel">
        <div className="settings-drawer-header">
          <div>
            <p className="settings-drawer-label">Preferences</p>
            <h3>Settings</h3>
          </div>
          <button type="button" aria-label="Close settings" className="settings-close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-drawer-body">
          <nav className="settings-menu" aria-label="Settings menu">
            {menuItems.map(({ key, label, icon: Icon, description }) => (
              <button
                key={key}
                type="button"
                className={`settings-menu-item ${activeSection === key ? 'active' : ''}`}
                onClick={() => onSelectSection(key)}
              >
                <span className="settings-menu-icon"><Icon size={17} /></span>
                <span className="settings-menu-copy">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </nav>

          <div className="settings-content-panel">
            {renderContent()}
          </div>
        </div>
      </aside>
    </>
  )
}

function AboutKahaBookScreen({
  onBack,
  onOpenDeveloper,
}: {
  onBack: () => void
  onOpenDeveloper: () => void
}) {
  return (
    <div className="showcase-single-screen">
      <div className="mobile-header green-header">
        <button type="button" className="mobile-nav-button" aria-label="Back" onClick={onBack}><ArrowLeft size={18} /></button>
        <span>About KahaBook</span>
        <span className="header-spacer" />
      </div>

      <div className="about-hero-card">
        <div className="brand-mark large mint-mark">
          <div className="brand-book">
            <span className="book-spine" />
            <span className="book-pages" />
          </div>
        </div>
        <h3>KahaBook</h3>
        <p>Simple Accounting<br />for Your Business</p>
      </div>

      <div className="about-info-list compact-list">
        <div className="about-info-row">
          <span className="info-icon"><FileText size={16} /></span>
          <span className="info-copy">
            <strong>App Version</strong>
            <small>1.0.0</small>
          </span>
        </div>
        <div className="about-info-row">
          <span className="info-icon"><FileText size={16} /></span>
          <span className="info-copy">
            <strong>What&apos;s New</strong>
            <small>See latest updates</small>
          </span>
        </div>
        <div className="about-info-row selected-row" onClick={onOpenDeveloper} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenDeveloper() }}>
          <span className="info-icon"><User size={16} /></span>
          <span className="info-copy">
            <strong>Developer</strong>
            <small>Meet the developer</small>
          </span>
        </div>
        <div className="about-info-row">
          <span className="info-icon"><ShieldCheck size={16} /></span>
          <span className="info-copy">
            <strong>Privacy Policy</strong>
            <small>Read our privacy policy</small>
          </span>
        </div>
        <div className="about-info-row">
          <span className="info-icon"><FileText size={16} /></span>
          <span className="info-copy">
            <strong>Terms &amp; Conditions</strong>
            <small>Read our terms</small>
          </span>
        </div>
        <div className="about-info-row">
          <span className="info-icon"><Star size={16} /></span>
          <span className="info-copy">
            <strong>Rate Us</strong>
            <small>Support us on Play Store</small>
          </span>
        </div>
      </div>
    </div>
  )
}

function DeveloperProfileScreen({
  onBack,
}: {
  onBack: () => void
}) {
  return (
    <div className="showcase-single-screen developer-single-screen">
      <div className="mobile-header green-header">
        <button type="button" className="mobile-nav-button" aria-label="Back" onClick={onBack}><ArrowLeft size={18} /></button>
        <span>Developer</span>
        <span className="header-spacer" />
      </div>

      <div className="developer-profile-card-demo">
        <div className="developer-avatar-frame">
          <img src={developerProfileImage} alt="Er. Manish Kumar Yadav" className="developer-demo-photo" />
        </div>
        <div className="developer-bio-label">Developed by</div>
        <h4>Er. Manish Kumar Yadav</h4>
        <p>Designed this Khatabook</p>
      </div>

      <div className="mini-quote-card">
        Building simple and powerful business solutions like KahaBook.
      </div>

      <div className="contact-card">
        <div className="contact-row">
          <span className="contact-icon"><Phone size={16} /></span>
          <div>
            <strong>Phone</strong>
            <a href="tel:+916283092662" target="_self" rel="noreferrer">+91 62830 92662</a>
          </div>
        </div>
        <div className="contact-row">
          <span className="contact-icon"><Mail size={16} /></span>
          <div>
            <strong>Email</strong>
            <a href="mailto:manish25er@gmail.com">manish25er@gmail.com</a>
          </div>
        </div>
        <div className="contact-row">
          <span className="contact-icon"><Globe size={16} /></span>
          <div>
            <strong>Website</strong>
            <a href="https://roomspot.manish25er.workers.dev/portfolio" target="_blank" rel="noreferrer">roomspot.manish25er.workers.dev/portfolio</a>
          </div>
        </div>
        <div className="contact-row">
          <span className="contact-icon"><Users size={16} /></span>
          <div>
            <strong>LinkedIn</strong>
            <a href="https://linkedin.com/in/yourprofile" target="_blank" rel="noreferrer">linkedin.com/in/yourprofile</a>
          </div>
        </div>
        <div className="contact-row">
          <span className="contact-icon"><MapPin size={16} /></span>
          <div><strong>Location</strong><small>India</small></div>
        </div>
      </div>

      <div className="quote-card">
        <span className="quote-mark">“</span>
        <p>Passionate about building simple, reliable and user-friendly applications for businesses.</p>
      </div>
    </div>
  )
}

function DashboardScreen({
  businessName,
  businessLogo,
  customerName,
  summary,
  customers,
  transactionsByCustomer,
  onAddCustomer,
  onAddTransaction,
  onViewCustomers,
  onSelectCustomer,
  onOpenSettings,
  onLogout,
}: {
  businessName: string
  businessLogo?: string
  customerName: string
  summary: { totalReceivable: number; totalPayable: number; totalGiven: number; totalReceived: number }
  customers: Customer[]
  transactionsByCustomer: Record<string, CustomerTransaction[]>
  onAddCustomer: () => void
  onAddTransaction: () => void
  onViewCustomers: () => void
  onSelectCustomer: (customerId: string) => void
  onOpenSettings: () => void
  onLogout: () => void
}) {
  const businessInitials = (businessName || 'K').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return (
    <div className="screen dashboard-screen fade-up">
      <header className="dashboard-header">
        <div className="brand-identity">
          <div className="brand-mark small premium-mark">
            <div className="brand-book mini">
              <span className="book-spine" />
              <span className="book-pages" />
            </div>
          </div>
          <div className="brand-meta">
            <span className="brand-text">KhataPro</span>
            <small>Dashboard</small>
          </div>
        </div>

        <div className="header-actions">
          <button type="button" className="logout-pill" onClick={onLogout}>
            <LogOut size={14} />
            Logout
          </button>
          <button type="button" className="icon-button bell-button" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <button type="button" className="business-header-button" onClick={onOpenSettings} aria-label="Business settings">
            {businessLogo ? (
              <img src={businessLogo} alt={`${businessName} logo`} className="business-header-avatar" />
            ) : (
              <div className="business-header-avatar default-business-avatar">{businessInitials}</div>
            )}
          </button>
        </div>
      </header>

      <div className="dashboard-greeting">
        <p className="mini-label light">Good Morning,</p>
        <h3>{customerName}</h3>
        <p className="dashboard-business-name">{businessName}</p>
      </div>

      <div className="summary-grid">
        <div className="metric-card">
          <span>Total Receivable</span>
          <strong>{money(summary.totalReceivable)}</strong>
        </div>
        <div className="metric-card danger">
          <span>Total Payable</span>
          <strong>{money(summary.totalPayable)}</strong>
        </div>
      </div>

      <div className="mini-stat-grid">
        <div className="mini-stat-card">
          <span>Total Given</span>
          <strong>{money(summary.totalGiven)}</strong>
        </div>
        <div className="mini-stat-card">
          <span>Total Received</span>
          <strong>{money(summary.totalReceived)}</strong>
        </div>
      </div>

      <div className="quick-actions-grid">
        <button type="button" className="quick-action green" onClick={onAddCustomer}>
          <UserPlus size={17} />
          <span>Add Customer</span>
        </button>
        <button type="button" className="quick-action blue" onClick={onAddTransaction}>
          <Wallet size={17} />
          <span>Add Transaction</span>
        </button>
        <button type="button" className="quick-action gold">
          <Bell size={17} />
          <span>Send Reminder</span>
        </button>
      </div>

      <div className="section-header">
        <h4>All Customers</h4>
        <button type="button" className="text-link" onClick={onViewCustomers}>View all</button>
      </div>

      <div className="customer-preview-list">
        {customers.map((customer) => {
          const balance = computeCustomerBalance(customer, transactionsByCustomer[customer.id] ?? [])
          return (
            <div key={customer.id} className="customer-preview-row" onClick={() => onSelectCustomer(customer.id)} role="button" tabIndex={0}>
              <div className="customer-preview-left">
                <div className="avatar-badge small-badge">{customer.name.charAt(0)}</div>
                <div>
                  <strong>{customer.name}</strong>
                  <small>{customer.phone}</small>
                </div>
              </div>
              <div className="customer-preview-right">
                <strong className={balance >= 0 ? 'positive' : 'negative'}>{balance >= 0 ? '+' : '-'}{money(Math.abs(balance))}</strong>
                <small>{balance >= 0 ? 'Receivable' : 'Payable'}</small>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-header recent-header">
        <h4>Recent Transactions</h4>
        <button type="button" className="text-link" onClick={onViewCustomers}>View all</button>
      </div>

      <div className="txn-list compact">
        {customers.slice(0, 2).map((customer) => {
          const balance = computeCustomerBalance(customer, transactionsByCustomer[customer.id] ?? [])
          return (
            <div key={customer.id} className="txn-item" onClick={() => onSelectCustomer(customer.id)} role="button" tabIndex={0}>
              <span className={`txn-icon ${balance >= 0 ? 'positive' : 'negative'}`}>
                {balance >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
              </span>
              <div>
                <strong>{customer.name}</strong>
                <small>{balance >= 0 ? 'You received' : 'You gave'}</small>
              </div>
              <div className="txn-meta">
                <strong className={balance >= 0 ? 'positive' : 'negative'}>{balance >= 0 ? '+' : '-'}{money(Math.abs(balance))}</strong>
                <small>Today</small>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CustomersScreen({
  customers,
  transactionsByCustomer,
  onSelectCustomer,
  onAddCustomer,
  onBack,
}: {
  customers: Customer[]
  transactionsByCustomer: Record<string, CustomerTransaction[]>
  onSelectCustomer: (customerId: string) => void
  onAddCustomer: () => void
  onBack: () => void
}) {
  return (
    <div className="screen customers-screen fade-up">
      <header className="panel-header row-between">
        <div className="header-left">
          <button type="button" className="icon-button soft" onClick={onBack}>
            <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h3>Customers</h3>
        </div>
        <button type="button" className="icon-button soft" onClick={onAddCustomer}>
          <Plus size={15} />
        </button>
      </header>

      <div className="search-box">
        <Search size={15} />
        <input type="text" value="Search by name or phone" readOnly />
      </div>

      <div className="customer-list">
        {customers.map((customer) => {
          const balance = computeCustomerBalance(customer, transactionsByCustomer[customer.id] ?? [])
          const due = balance > 0 ? 'Due' : balance < 0 ? 'Payable' : 'Settled'
          return (
            <div key={customer.id} className="customer-row" onClick={() => onSelectCustomer(customer.id)} role="button" tabIndex={0}>
              <div className="avatar-badge">{customer.name.charAt(0)}</div>
              <div className="customer-details">
                <strong>{customer.name}</strong>
                <small>{customer.phone}</small>
              </div>
              <div className="customer-balance">
                <strong className={balance === 0 ? 'settled' : 'due'}>{balance === 0 ? 'Settled' : money(Math.abs(balance))}</strong>
                <small>{due}</small>
              </div>
              <div className="list-caret" aria-hidden="true">
                <ChevronRight size={15} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KhataScreen({
  customer,
  transactions,
  paymentStatus,
  paymentAmount,
  businessName,
  onBack,
  onAddGiven,
  onAddReceived,
  onSendReminder,
  onPayNow,
  onPayAllDue,
  onPaymentAmountChange,
}: {
  customer: Customer
  transactions: CustomerTransaction[]
  paymentStatus: PaymentState | null
  paymentAmount: number
  businessName: string
  onBack: () => void
  onAddGiven: () => void
  onAddReceived: () => void
  onSendReminder: () => void
  onPayNow: (amount: number) => void
  onPayAllDue: () => void
  onPaymentAmountChange: (amount: number) => void
}) {
  const balance = computeCustomerBalance(customer, transactions)
  const dueAmount = Math.max(balance, 0)

  return (
    <div className="screen khata-screen fade-up">
      <header className="khata-top">
        <button type="button" className="icon-button soft" onClick={onBack}>
          <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div className="customer-profile">
          <div className="avatar-badge large">{customer.name.charAt(0)}</div>
          <div>
            <h3>{customer.name}</h3>
            <small>{customer.phone}</small>
          </div>
        </div>
        <button type="button" className="icon-button soft">
          <PhoneIcon />
        </button>
      </header>

      <div className="balance-card-highlight">
        <span>Current balance</span>
        <strong>{money(Math.abs(balance))}</strong>
        <small>{balance > 0 ? 'Due' : balance < 0 ? 'You receive' : 'Settled'}</small>
      </div>

      {paymentStatus && (paymentStatus.status === 'success' || paymentStatus.status === 'verified') && (
        <div className="payment-success-overlay" role="dialog" aria-modal="true" aria-live="polite">
          <div className="payment-success-modal">
            <button type="button" className="payment-flash-close" aria-label="Dismiss success message" onClick={() => setPaymentStates((prev) => ({ ...prev, [customer.id]: { ...paymentStatus, status: 'verified' } }))}>
              ×
            </button>

            <div className="success-check-ring large-ring">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 12.5L10.2 15.7L17 8.9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <span className="payment-flash-kicker">Payment received</span>
            <h4>Payment done</h4>
            <div className="payment-success-amount">{money(paymentStatus.amount)}</div>
            <small className="payment-success-reference">Ref: {paymentStatus.reference}</small>

            <button type="button" className="primary-button payment-success-button" onClick={() => setPaymentStates((prev) => ({ ...prev, [customer.id]: { ...paymentStatus, status: 'verified' } }))}>
              Done
            </button>
          </div>
        </div>
      )}

      {dueAmount > 0 && (
        <div className="payment-request-card">
          <div className="payment-request-top">
            <span className="payment-request-label">Pay Pending Amount</span>
            {paymentStatus && (
              <span className={`payment-status-badge status-${paymentStatus.status}`}>
                {paymentStatus.status === 'initiated' || paymentStatus.status === 'pending' ? 'In progress' : paymentStatus.status}
              </span>
            )}
          </div>

          <div className="payment-request-amount">{money(dueAmount)}</div>

          <div className="payment-request-meta">
            <span>{businessName}</span>
            <span>{OWNER_UPI_ID}</span>
          </div>

          <label className="payment-input-field">
            <span>Payment amount</span>
            <input
              type="number"
              min="1"
              step="1"
              value={paymentAmount || dueAmount}
              onChange={(event) => onPaymentAmountChange(Number(event.target.value || 0))}
            />
          </label>

          <div className="payment-action-row">
            <button type="button" className="primary-button pay-now-button" onClick={() => onPayNow(Math.min(paymentAmount || dueAmount, dueAmount))}>
              Pay Now
            </button>
            <button type="button" className="secondary-button pay-all-button" onClick={onPayAllDue}>
              Pay All Due
            </button>
          </div>

          {paymentStatus && (
            <div className="payment-status-note">
              {paymentStatus.status === 'initiated' || paymentStatus.status === 'pending'
                ? 'Payment initiated successfully. Awaiting secure verification.'
                : paymentStatus.status === 'verified'
                  ? 'Payment verified successfully.'
                  : paymentStatus.status === 'failed'
                    ? 'Payment failed. Please retry after checking your UPI app.'
                    : paymentStatus.status === 'cancelled'
                      ? 'Payment cancelled by the user.'
                      : 'Transaction is pending secure verification.'}
            </div>
          )}
        </div>
      )}

      <div className="khata-actions">
        <button type="button" className="action-pill negative" onClick={onAddGiven}>You Gave</button>
        <button type="button" className="action-pill positive" onClick={onAddReceived}>You Received</button>
        <button type="button" className="action-pill neutral" onClick={onSendReminder}>Send Reminder</button>
      </div>

      <div className="transaction-timeline">
        {transactions.length > 0 ? (
          transactions.map((item) => (
            <div key={item.id} className="history-item">
              <span className={`dot ${item.type === 'received' ? 'green' : 'red'}`} />
              <div>
                <strong>{item.type === 'received' ? 'You Received' : 'You Gave'}</strong>
                <small>{item.date}</small>
              </div>
              <span className={`amount ${item.type === 'received' ? 'positive' : 'negative'}`}>
                {item.type === 'received' ? '+' : '-'}{money(item.amount)}
              </span>
            </div>
          ))
        ) : (
          <div className="empty-card compact-empty">
            <p>No transactions yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CustomerFormScreen({
  form,
  onFieldChange,
  onCancel,
  onSubmit,
}: {
  form: typeof emptyCustomerForm
  onFieldChange: (value: typeof emptyCustomerForm) => void
  onCancel: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="screen add-form-screen fade-up">
      <header className="transaction-header slim-header">
        <button type="button" className="icon-button soft" onClick={onCancel} aria-label="Back">
          <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <h3>Add Customer</h3>
      </header>

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="field"><span>Name</span><input value={form.name} onChange={(event) => onFieldChange({ ...form, name: event.target.value })} placeholder="Enter customer name" /></label>
        <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => onFieldChange({ ...form, phone: event.target.value })} placeholder="Enter phone number" /></label>
        <label className="field"><span>Email</span><input value={form.email} onChange={(event) => onFieldChange({ ...form, email: event.target.value })} placeholder="Enter email" /></label>
        <label className="field"><span>Address</span><input value={form.address} onChange={(event) => onFieldChange({ ...form, address: event.target.value })} placeholder="Enter address" /></label>
        <label className="field"><span>Opening Balance</span><input type="number" value={form.openingBalance} onChange={(event) => onFieldChange({ ...form, openingBalance: event.target.value })} /></label>
        <label className="field"><span>Receivable / Payable</span><select value={form.openingBalanceType} onChange={(event) => onFieldChange({ ...form, openingBalanceType: event.target.value as 'receivable' | 'payable' | 'settled' })}><option value="receivable">Receivable</option><option value="payable">Payable</option><option value="settled">Settled</option></select></label>
        <label className="field"><span>Notes</span><input value={form.notes} onChange={(event) => onFieldChange({ ...form, notes: event.target.value })} placeholder="Notes (optional)" /></label>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary-button">Save Customer</button>
        </div>
      </form>
    </div>
  )
}

function TransactionFormScreen({
  customerName,
  form,
  onFieldChange,
  onCancel,
  onSubmit,
}: {
  customerName: string
  form: typeof emptyTransactionForm
  onFieldChange: (value: typeof emptyTransactionForm) => void
  onCancel: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const paymentOptions: Array<{ value: string; label: string; icon: string }> = [
    { value: 'cash', label: 'Cash', icon: '₹' },
    { value: 'upi', label: 'UPI', icon: '✦' },
    { value: 'bank_transfer', label: 'Bank', icon: '▣' },
    { value: 'cheque', label: 'Cheque', icon: '✓' },
    { value: 'other', label: 'Other', icon: '•' },
  ]

  const paymentMethodToValue = String(form.paymentMethod ?? 'cash')

  return (
    <div className="screen transaction-form-screen fade-up">
      <header className="transaction-header">
        <button type="button" className="icon-button soft" onClick={onCancel} aria-label="Back">
          <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div className="transaction-header-copy">
          <h3>Add Transaction</h3>
          <strong>{customerName}</strong>
        </div>
      </header>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-toggle">
          <button
            type="button"
            className={`toggle-option ${form.type === 'given' ? 'active' : ''}`}
            onClick={() => onFieldChange({ ...form, type: 'given' })}
          >
            You Gave
          </button>
          <button
            type="button"
            className={`toggle-option ${form.type === 'received' ? 'active' : ''}`}
            onClick={() => onFieldChange({ ...form, type: 'received' })}
          >
            You Received
          </button>
        </div>

        <label className="field amount-field">
          <span>Amount</span>
          <div className="amount-input-wrap">
            <span className="currency-sign">₹</span>
            <input type="number" value={form.amount} onChange={(event) => onFieldChange({ ...form, amount: event.target.value })} placeholder="0" />
          </div>
        </label>

        <label className="field">
          <span>Description</span>
          <input value={form.description} onChange={(event) => onFieldChange({ ...form, description: event.target.value })} placeholder="Enter description" />
        </label>

        <div className="field payment-block">
          <span>Payment Method</span>
          <div className="payment-grid">
            {paymentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`payment-option ${paymentMethodToValue === option.value ? 'selected' : ''}`}
                onClick={() => onFieldChange({ ...form, paymentMethod: option.value as typeof form.paymentMethod })}
              >
                <span className="payment-icon">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Date</span>
          <input type="date" value={form.date} onChange={(event) => onFieldChange({ ...form, date: event.target.value })} />
        </label>

        <label className="field">
          <span>Notes (Optional)</span>
          <input value={form.notes} onChange={(event) => onFieldChange({ ...form, notes: event.target.value })} placeholder="Enter notes" />
        </label>

        <div className="form-actions transaction-actions">
          <button type="submit" className="primary-button wide-button">Save Transaction</button>
        </div>
      </form>
    </div>
  )
}

function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="screen placeholder-screen fade-up">
      <div className="placeholder-box">
        <CreditCard size={28} />
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

function LoanOfferPopup({
  offer,
  onCheckEligibility,
  onClose,
}: {
  offer: LoanOffer
  onCheckEligibility: () => void
  onClose: () => void
}) {
  return (
    <div className="loan-offer-backdrop" onClick={onClose}>
      <div className="loan-offer-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="loan-close-button" aria-label="Close offer" onClick={onClose}>×</button>

        <div className="loan-offer-illustration" aria-hidden="true">
          <div className="offer-coin">₹</div>
          <div className="offer-card-mini" />
          <div className="offer-chart" />
        </div>

        <div className="loan-offer-headline">Business Loan</div>
        <h3 className="loan-offer-title">You may be eligible for</h3>
        <div className="loan-offer-amount">up to ₹{offer.maxAmount.toLocaleString('en-IN')}</div>
        <p className="loan-offer-subtitle">Grow your business with quick and flexible financing.</p>

        <div className="loan-offer-actions">
          <button type="button" className="primary-button loan-check-button" onClick={onCheckEligibility}>Check Eligibility</button>
          <button type="button" className="secondary-button loan-maybe-button" onClick={onClose}>Maybe Later</button>
        </div>
      </div>
    </div>
  )
}

function LoanOfferListScreen({
  businessName,
  offer,
  onOpenOffer,
  onBack,
}: {
  businessName: string
  offer: LoanOffer
  onOpenOffer: () => void
  onBack: () => void
}) {
  return (
    <div className="screen loan-screen fade-up">
      <header className="panel-header row-between">
        <div className="header-left">
          <button type="button" className="icon-button soft" onClick={onBack}>
            <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h3>Loans</h3>
        </div>
      </header>

      <div className="loan-overview-card">
        <div className="loan-overview-top">
          <span className="loan-pill">Available Offer</span>
          <span className="loan-provider">{offer.providerName}</span>
        </div>
        <h4>{offer.title}</h4>
        <p className="loan-overview-copy">{offer.subtitle}</p>
        <button type="button" className="primary-button loan-cta" onClick={onOpenOffer}>View Offer</button>
      </div>

      <div className="loan-info-box">
        <strong>{businessName}</strong>
        <span>Business financing support may be available based on verified partner eligibility.</span>
      </div>
    </div>
  )
}

function LoanDetailScreen({
  offer,
  selectedAmount,
  tenure,
  onSelectAmount,
  onSelectTenure,
  onBack,
  onContinue,
}: {
  offer: LoanOffer
  selectedAmount: number
  tenure: '3 Months' | '6 Months' | '12 Months'
  onSelectAmount: (amount: number) => void
  onSelectTenure: (value: '3 Months' | '6 Months' | '12 Months') => void
  onBack: () => void
  onContinue: () => void
}) {
  const monthMap: Record<'3 Months' | '6 Months' | '12 Months', number> = {
    '3 Months': 1.08,
    '6 Months': 1.12,
    '12 Months': 1.18,
  }

  const estimate = Math.round(selectedAmount * monthMap[tenure])
  const monthly = Math.round(estimate / (tenure === '3 Months' ? 3 : tenure === '6 Months' ? 6 : 12))

  return (
    <div className="screen loan-detail-screen fade-up">
      <header className="panel-header row-between">
        <div className="header-left">
          <button type="button" className="icon-button soft" onClick={onBack}>
            <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h3>Loan Offer</h3>
        </div>
      </header>

      <div className="loan-hero-card">
        <span className="loan-pill">{offer.providerName}</span>
        <h4>{offer.title}</h4>
        <div className="loan-hero-amount">Up to ₹{offer.maxAmount.toLocaleString('en-IN')}</div>
      </div>

      <div className="loan-option-block">
        <div className="loan-block-label">Choose Loan Amount</div>
        <div className="loan-chip-grid">
          {[25000, 40000, 50000].map((amount) => (
            <button
              key={amount}
              type="button"
              className={`loan-chip ${selectedAmount === amount ? 'selected' : ''}`}
              onClick={() => onSelectAmount(amount)}
            >
              ₹{amount.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </div>

      <div className="loan-option-block">
        <div className="loan-block-label">Choose Tenure</div>
        <div className="loan-chip-grid">
          {(['3 Months', '6 Months', '12 Months'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`loan-chip ${tenure === option ? 'selected' : ''}`}
              onClick={() => onSelectTenure(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="loan-summary-card">
        <div className="summary-row"><span>Estimated repayment</span><strong>₹{estimate.toLocaleString('en-IN')}</strong></div>
        <div className="summary-row"><span>Interest / charges</span><strong>Indicative only</strong></div>
        <div className="summary-row"><span>Monthly estimate</span><strong>₹{monthly.toLocaleString('en-IN')}</strong></div>
      </div>

      <div className="loan-terms-box">
        <p>Eligibility decisions are made by the partner lender or backend provider. This page is a pre-check and not a final approval.</p>
      </div>

      <button type="button" className="primary-button full-width" onClick={onContinue}>Continue</button>
    </div>
  )
}

function LoanApplicationScreen({
  form,
  businessName,
  amount,
  tenure,
  onFieldChange,
  onBack,
  onSubmit,
}: {
  form: {
    fullName: string
    mobileNumber: string
    businessName: string
    businessCategory: string
    businessAddress: string
    loanAmount: string
    purpose: string
  }
  businessName: string
  amount: number
  tenure: '3 Months' | '6 Months' | '12 Months'
  onFieldChange: (next: typeof form) => void
  onBack: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
}) {
  return (
    <div className="screen loan-application-screen fade-up">
      <header className="panel-header row-between">
        <div className="header-left">
          <button type="button" className="icon-button soft" onClick={onBack}>
            <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h3>Loan Application</h3>
        </div>
      </header>

      <div className="loan-application-card">
        <div className="application-summary-head">
          <span>Request</span>
          <strong>₹{amount.toLocaleString('en-IN')}</strong>
        </div>
        <div className="application-summary-meta">{tenure} • {businessName}</div>
      </div>

      <form className="auth-form loan-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Full Name</span>
          <input value={form.fullName} onChange={(event) => onFieldChange({ ...form, fullName: event.target.value })} />
        </label>
        <label className="field">
          <span>Mobile Number</span>
          <input value={form.mobileNumber} onChange={(event) => onFieldChange({ ...form, mobileNumber: event.target.value })} />
        </label>
        <label className="field">
          <span>Business Name</span>
          <input value={form.businessName} onChange={(event) => onFieldChange({ ...form, businessName: event.target.value })} />
        </label>
        <label className="field">
          <span>Business Category</span>
          <input value={form.businessCategory} onChange={(event) => onFieldChange({ ...form, businessCategory: event.target.value })} />
        </label>
        <label className="field">
          <span>Business Address</span>
          <textarea value={form.businessAddress} onChange={(event) => onFieldChange({ ...form, businessAddress: event.target.value })} rows={3} />
        </label>
        <label className="field">
          <span>Loan Amount</span>
          <input value={form.loanAmount} onChange={(event) => onFieldChange({ ...form, loanAmount: event.target.value })} />
        </label>
        <label className="field">
          <span>Purpose of Loan</span>
          <input value={form.purpose} onChange={(event) => onFieldChange({ ...form, purpose: event.target.value })} />
        </label>

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onBack}>Back</button>
          <button type="submit" className="primary-button">Submit Application</button>
        </div>
      </form>
    </div>
  )
}

function PaymentSuccessScreen({
  amount,
  type,
  reference,
  onDone,
}: {
  amount: number
  type: 'given' | 'received'
  reference: string
  onDone: () => void
}) {
  const usdAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

  useEffect(() => {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    try {
      const ctx = new AudioCtor()
      const notes = [
        { freq: 740, start: 0, duration: 0.16, type: 'triangle' },
        { freq: 880, start: 0.12, duration: 0.18, type: 'sine' },
        { freq: 1040, start: 0.24, duration: 0.22, type: 'triangle' },
      ] as const

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime)
      masterGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02)
      masterGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7)
      masterGain.connect(ctx.destination)

      notes.forEach(({ freq, start, duration, type }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = type
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        osc.frequency.exponentialRampToValueAtTime(freq * 1.08, ctx.currentTime + start + duration)

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration)
      })

      const closeTimer = window.setTimeout(() => {
        void ctx.close()
      }, 900)

      return () => {
        window.clearTimeout(closeTimer)
      }
    } catch {
      // Ignore audio failures in unsupported browsers.
    }
  }, [])

  return (
    <div className="screen payment-success-screen fade-up">
      <div className="payment-brand-row">
        <div className="paytabs-logo">
          <span className="paytabs-mark">P</span>
          <span>PayTabs</span>
        </div>
      </div>

      <h1 className="payment-title">Seamless<br />Transactions</h1>

      <div className="success-card">
        <div className="success-badge-wrap">
          <div className="success-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 12.5 10.2 15.7 17 8.9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h2>Success</h2>
        <p>{type === 'given' ? 'Payment Sent!' : 'Payment Received!'}</p>
        <div className="success-amount">{usdAmount}</div>

        <button type="button" className="success-primary-button" onClick={onDone}>Done</button>

        <div className="success-reference-row">
          <span>Transaction Reference</span>
          <strong>{reference}</strong>
        </div>
      </div>
    </div>
  )
}

function ProfileScreen({
  profile,
  businessName,
  onImageChange,
  onFieldChange,
  onSave,
  onBack,
}: {
  profile: typeof demoProfile
  businessName: string
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFieldChange: (value: typeof demoProfile) => void
  onSave: () => void
  onBack: () => void
}) {
  return (
    <div className="screen profile-screen fade-up">
      <header className="panel-header row-between">
        <div className="header-left">
          <button type="button" className="icon-button soft" onClick={onBack}>
            <ChevronRight size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h3>Profile</h3>
        </div>
      </header>

      <div className="profile-card">
        <label className="profile-avatar-upload" htmlFor="profile-image-upload">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} />
          ) : (
            <div className="avatar-badge large">{profile.name.charAt(0)}</div>
          )}
          <span>Upload photo</span>
        </label>
        <input id="profile-image-upload" type="file" accept="image/*" onChange={onImageChange} hidden />

        <div className="profile-meta">
          <strong>{profile.name}</strong>
          <span>{businessName}</span>
        </div>
      </div>

      <div className="auth-form profile-form">
        <label className="field">
          <span>Name</span>
          <input value={profile.name} onChange={(event) => onFieldChange({ ...profile, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={profile.email} onChange={(event) => onFieldChange({ ...profile, email: event.target.value })} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={profile.phone} onChange={(event) => onFieldChange({ ...profile, phone: event.target.value })} />
        </label>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onBack}>Cancel</button>
          <button type="button" className="primary-button" onClick={onSave}>Save Profile</button>
        </div>
      </div>
    </div>
  )
}

function PhoneIcon() {
  return <Wallet size={16} />
}

export default App
