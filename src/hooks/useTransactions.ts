import { useEffect, useState } from 'react'
import { getCustomerTransactions } from '../services/transactionService'
import type { CustomerTransaction } from '../types'

export function useTransactions(businessId?: string, customerId?: string) {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [loading, setLoading] = useState(Boolean(businessId && customerId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId || !customerId) {
      setTransactions([])
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getCustomerTransactions(businessId, customerId)
        if (isMounted) setTransactions(result)
      } catch (err) {
        if (isMounted) setError('Unable to load transactions.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId, customerId])

  return { transactions, loading, error }
}
