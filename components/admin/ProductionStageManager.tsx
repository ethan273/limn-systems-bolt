'use client'

import { useState, useEffect } from 'react'
import { useProductionTracking } from '@/hooks/useProductionTracking'
import {
  Save,
  Camera,
  Star
} from 'lucide-react'

interface ProductionStage {
  id: string
  name: string
  description: string
  order: number
  icon: string
}

interface ProductionStageManagerProps {
  orderItemId: string
  orderId?: string
  onUpdate?: () => void
}

export default function ProductionStageManager({ 
  orderItemId, 
  orderId,
  onUpdate 
}: ProductionStageManagerProps) {
  const [stages, setStages] = useState<ProductionStage[]>([])
  const [selectedStage, setSelectedStage] = useState('')
  const [notes, setNotes] = useState('')
  const [qualityScore, setQualityScore] = useState(100)
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal')
  const [photos, setPhotos] = useState<File[]>([])
  const [updating, setUpdating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { data, loading, refetch } = useProductionTracking(orderId || '')

  const currentStatus = data?.items.find(item => item.id === orderItemId)

  useEffect(() => {
    // Load production stages
    const loadStages = async () => {
      try {
        const response = await fetch('/api/production/stages')
        if (response.ok) {
          const data = await response.json()
          setStages(data)
        }
      } catch (error) {
        console.error('Failed to load stages:', error)
        // Fallback to mock stages
        setStages([
          { id: '1', name: 'Order Confirmed', description: 'Order received and confirmed', order: 1, icon: 'CheckCircle' },
          { id: '2', name: 'Materials Sourcing', description: 'Gathering required materials', order: 2, icon: 'Package' },
          { id: '3', name: 'Production Queue', description: 'Waiting in production queue', order: 3, icon: 'Clock' },
          { id: '4', name: 'In Production', description: 'Currently being manufactured', order: 4, icon: 'Package' },
          { id: '5', name: 'Quality Control', description: 'Quality inspection and testing', order: 5, icon: 'CheckCircle' },
          { id: '6', name: 'Finishing', description: 'Final finishing touches', order: 6, icon: 'Package' },
          { id: '7', name: 'Final Inspection', description: 'Final quality check', order: 7, icon: 'CheckCircle' },
          { id: '8', name: 'Packaging', description: 'Packaging for shipment', order: 8, icon: 'Package' },
          { id: '9', name: 'Ready to Ship', description: 'Ready for pickup/shipment', order: 9, icon: 'Package' },
          { id: '10', name: 'Shipped', description: 'Item has been shipped', order: 10, icon: 'Package' }
        ])
      }
    }

    loadStages()
  }, [])

  useEffect(() => {
    if (currentStatus) {
      setSelectedStage(currentStatus.currentStage)
      // setPriority(currentStatus.priority) // Property may not exist in new structure
    }
  }, [currentStatus])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setPhotos(prev => [...prev, ...files])
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)

    try {
      // Update production stage via API
      const response = await fetch(`/api/production-items/${orderItemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_stage: selectedStage,
          notes,
          quality_score: qualityScore,
        }),
      })

      if (response.ok) {
        // Upload photos if any
        if (photos.length > 0) {
          await uploadPhotos()
        }

        setNotes('')
        setPhotos([])
        onUpdate?.()
        refetch() // Refresh data from the hook
      } else {
        throw new Error('Failed to update production stage')
      }
    } catch (error) {
      console.error('Failed to update production stage:', error)
    } finally {
      setUpdating(false)
    }
  }

  const uploadPhotos = async () => {
    // Implementation for photo upload would go here
    // This is a placeholder for the actual upload logic
    console.log('Uploading photos:', photos)
  }

  const getPriorityColor = (p: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[p] || colors.normal
  }


  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Production Stage Manager</h3>
            <p className="text-sm text-gray-600">Update production status and add notes</p>
          </div>
          {currentStatus && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}>
              {priority.toUpperCase()} PRIORITY
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Current Status */}
        {currentStatus && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Current Status</h4>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Current Stage</p>
                <p className="font-medium">{currentStatus.currentStage}</p>
              </div>
              <div>
                <p className="text-gray-600">Progress</p>
                <p className="font-medium">{currentStatus.overallProgress}%</p>
              </div>
              <div>
                <p className="text-gray-600">Stage Progress</p>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${currentStatus.stageProgress}%` }}
                    />
                  </div>
                  <span className="font-medium">{currentStatus.stageProgress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Production Stage
          </label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a stage</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name} - {stage.description}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['urgent', 'high', 'normal', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  priority === p
                    ? getPriorityColor(p)
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quality Score (0-100)
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={qualityScore}
              onChange={(e) => setQualityScore(parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-900">{qualityScore}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add notes about this stage update..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Production Photos
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> production photos
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setNotes('')
              setPhotos([])
              setSelectedStage(currentStatus?.currentStage || '')
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={updating || !selectedStage}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {updating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update Stage
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}