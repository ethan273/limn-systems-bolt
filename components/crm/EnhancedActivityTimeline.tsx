'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail, Phone, Calendar, MessageSquare,
  DollarSign, FileText, CheckCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'email' | 'call' | 'meeting' | 'note' | 'deal_created' | 'status_change'
  title: string
  description: string
  entity_type: string
  entity_id: string
  entity_name?: string
  created_by: string
  created_at: string
  metadata?: Record<string, unknown>
}

export default function EnhancedActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const loadActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/activities?filter=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail
      case 'call': return Phone
      case 'meeting': return Calendar
      case 'note': return MessageSquare
      case 'deal_created': return DollarSign
      case 'status_change': return CheckCircle
      default: return FileText
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-600'
      case 'call': return 'bg-green-100 text-green-600'
      case 'meeting': return 'bg-purple-100 text-purple-600'
      case 'note': return 'bg-gray-100 text-gray-600'
      case 'deal_created': return 'bg-yellow-100 text-yellow-600'
      case 'status_change': return 'bg-orange-100 text-orange-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const groupActivitiesByDate = () => {
    const grouped: Record<string, Activity[]> = {}
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    activities.forEach(activity => {
      const date = new Date(activity.created_at).toDateString()
      const key = date === today ? 'Today' :
                  date === yesterday ? 'Yesterday' :
                  date

      if (!grouped[key]) grouped[key] = []
      grouped[key].push(activity)
    })

    return grouped
  }

  if (loading) return <div>Loading activities...</div>

  const groupedActivities = groupActivitiesByDate()

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Activity Timeline</CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              All
            </Badge>
            <Badge
              variant={filter === 'email' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('email')}
            >
              Emails
            </Badge>
            <Badge
              variant={filter === 'call' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('call')}
            >
              Calls
            </Badge>
            <Badge
              variant={filter === 'meeting' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('meeting')}
            >
              Meetings
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date} className="relative">
              <div className="sticky top-0 bg-white p-4 z-10">
                <Badge variant="outline" className="bg-white">
                  {date}
                </Badge>
              </div>

              {dateActivities.map(activity => {
                const Icon = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.type)

                return (
                  <div key={activity.id} className="flex gap-3 p-4 hover:bg-gray-50 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{activity.title}</p>
                        {activity.entity_name && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.entity_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {activity.created_by} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}