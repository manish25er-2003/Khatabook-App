import { useEffect, useState } from 'react'
import { getReminders } from '../services/reminderService'
import type { Reminder } from '../types'

export function useReminders(businessId?: string) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setReminders([])
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getReminders(businessId)
        if (isMounted) setReminders(result)
      } catch (err) {
        if (isMounted) setError('Unable to load reminders.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId])

  return { reminders, loading, error }
}
