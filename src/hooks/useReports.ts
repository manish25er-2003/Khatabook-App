import { useEffect, useState } from 'react'
import { getDashboardMetrics } from '../services/reportService'
import type { DashboardSummary } from '../types'

export function useReports(businessId?: string) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setSummary(null)
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getDashboardMetrics(businessId)
        if (isMounted) setSummary(result)
      } catch (err) {
        if (isMounted) setError('Unable to load reports.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId])

  return { summary, loading, error }
}
