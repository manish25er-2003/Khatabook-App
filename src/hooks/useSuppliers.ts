import { useEffect, useState } from 'react'
import { getSuppliers } from '../services/supplierService'
import type { Supplier } from '../types'

export function useSuppliers(businessId?: string) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setSuppliers([])
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getSuppliers(businessId)
        if (isMounted) setSuppliers(result)
      } catch (err) {
        if (isMounted) setError('Unable to load suppliers.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId])

  return { suppliers, loading, error }
}
