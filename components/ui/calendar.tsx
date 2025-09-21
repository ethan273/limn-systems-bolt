"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CalendarProps {
  selected?: Date | { from?: Date; to?: Date }
  onSelect?: (date: Date | undefined | { from?: Date; to?: Date }) => void
  disabled?: (date: Date) => boolean
  className?: string
  mode?: "single" | "multiple" | "range"
  defaultMonth?: Date
  initialFocus?: boolean
  numberOfMonths?: number
}


function getCalendarDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  
  // Get first day of week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDay.getDay()
  
  // Start from the Sunday of the week containing the first day
  startDate.setDate(firstDay.getDate() - firstDayOfWeek)
  
  const days: Date[] = []
  for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
    days.push(new Date(startDate))
    startDate.setDate(startDate.getDate() + 1)
  }
  
  return days
}

export function Calendar({ selected, onSelect, disabled, className, defaultMonth }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    defaultMonth || 
    (selected instanceof Date ? selected : (selected?.from || new Date()))
  )
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  const calendarDays = getCalendarDays(currentMonth)
  
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return
    onSelect?.(date)
  }
  
  const isSelected = (date: Date) => {
    if (!selected) return false
    if (selected instanceof Date) {
      return date.toDateString() === selected.toDateString()
    }
    // Handle DateRange
    if (selected.from && selected.to) {
      return date >= selected.from && date <= selected.to
    }
    if (selected.from) {
      return date.toDateString() === selected.from.toDateString()
    }
    return false
  }
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }
  
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isDisabled = disabled && disabled(date)
          const isSelectedDate = isSelected(date)
          const isCurrentMonthDate = isCurrentMonth(date)
          const isTodayDate = isToday(date)
          
          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={`
                h-8 w-8 text-sm rounded-md transition-colors duration-200
                ${isSelectedDate 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-gray-100"
                }
                ${!isCurrentMonthDate 
                  ? "text-gray-300" 
                  : "text-gray-900"
                }
                ${isTodayDate && !isSelectedDate 
                  ? "bg-gray-100 font-semibold" 
                  : ""
                }
                ${isDisabled 
                  ? "opacity-50 cursor-not-allowed" 
                  : "cursor-pointer"
                }
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}