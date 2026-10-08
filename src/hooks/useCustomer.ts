import { useEffect, useState } from 'react'
import { getCustomer } from '../services/customerService'
import type { Customer } from '../types'

export function useCustomer(businessId?: string, customerId?: string) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(Boolean(businessId && customerId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId || !customerId) {
      setCustomer(null)
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getCustomer(businessId, customerId)
        if (isMounted) setCustomer(result)
      } catch (err) {
        if (isMounted) setError('Unable to load customer details.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId, customerId])

  return { customer, loading, error }
}
