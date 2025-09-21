'use client'

import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Archive, Phone } from 'lucide-react'

interface SwipeableLeadCardProps {
  onArchive: () => void
  onCall: () => void
  children: React.ReactNode
}

export default function SwipeableLeadCard({
  onArchive,
  onCall,
  children
}: SwipeableLeadCardProps) {
  const [swipeAmount, setSwipeAmount] = useState(0)

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setSwipeAmount(eventData.deltaX)
    },
    onSwipedLeft: () => {
      if (Math.abs(swipeAmount) > 100) {
        onArchive()
      }
      setSwipeAmount(0)
    },
    onSwipedRight: () => {
      if (swipeAmount > 100) {
        onCall()
      }
      setSwipeAmount(0)
    },
    trackMouse: false
  })

  return (
    <div className="relative overflow-hidden" {...handlers}>
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-green-600">
          <Phone className="w-5 h-5" />
          <span className="font-medium">Call</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Archive className="w-5 h-5" />
          <span className="font-medium">Archive</span>
        </div>
      </div>

      {/* Swipeable card */}
      <div
        style={{
          transform: `translateX(${swipeAmount}px)`,
          transition: swipeAmount === 0 ? 'transform 0.3s' : 'none'
        }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  )
}