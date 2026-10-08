import { useEffect, useState } from 'react'
import { getBusiness } from '../services/businessService'
import type { Business } from '../types'

export function useBusiness(businessId?: string) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setBusiness(null)
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getBusiness(businessId)
        if (isMounted) setBusiness(result)
      } catch (err) {
        if (isMounted) setError('Unable to load business details.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId])

  return { business, loading, error }
}
