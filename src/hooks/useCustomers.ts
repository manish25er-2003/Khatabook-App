import { useEffect, useState } from 'react'
import { getCustomers } from '../services/customerService'
import type { Customer } from '../types'

export function useCustomers(businessId?: string) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setCustomers([])
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getCustomers(businessId)
        if (isMounted) setCustomers(result.items)
      } catch (err) {
        if (isMounted) setError('Unable to load customers.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId])

  return { customers, loading, error }
}
