import { useEffect, useState } from 'react'
import { getSupplier } from '../services/supplierService'
import type { Supplier } from '../types'

export function useSupplier(businessId?: string, supplierId?: string) {
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(Boolean(businessId && supplierId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId || !supplierId) {
      setSupplier(null)
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getSupplier(businessId, supplierId)
        if (isMounted) setSupplier(result)
      } catch (err) {
        if (isMounted) setError('Unable to load supplier details.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId, supplierId])

  return { supplier, loading, error }
}
