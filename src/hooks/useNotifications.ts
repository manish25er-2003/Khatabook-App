import { useEffect, useState } from 'react'
import { getNotifications } from '../services/notificationService'
import type { NotificationItem } from '../types'

export function useNotifications(businessId?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(Boolean(businessId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setNotifications([])
      setLoading(false)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        setLoading(true)
        const result = await getNotifications(businessId)
        if (isMounted) setNotifications(result)
      } catch (err) {
        if (isMounted) setError('Unable to load notifications.')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [businessId])

  return { notifications, loading, error }
}
