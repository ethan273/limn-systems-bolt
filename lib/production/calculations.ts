export const PRODUCTION_STAGES = ['Design', 'Cutting', 'Assembly', 'Finishing', 'QC', 'Packaging']

export interface ProductionItem {
  id: string
  item_name: string
  quantity: number
  currentStage: string
  stageProgress: number
  overallProgress: number
  stages: Record<string, {
    progress: number
    started_at?: string
    completed_at?: string
    notes?: string
  }>
}

export function calculateOverallProgress(items: ProductionItem[]): number {
  if (items.length === 0) return 0
  
  // Weight by item quantity
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const weightedProgress = items.reduce(
    (sum, item) => sum + (item.overallProgress * item.quantity), 
    0
  )
  
  return Math.round(weightedProgress / totalQuantity)
}

export function getCurrentStage(items: ProductionItem[]): string {
  if (items.length === 0) return 'Design'
  
  // Find the most common current stage weighted by quantity
  const stageCounts: Record<string, number> = {}
  
  items.forEach(item => {
    stageCounts[item.currentStage] = (stageCounts[item.currentStage] || 0) + item.quantity
  })
  
  return Object.keys(stageCounts).reduce((a, b) => 
    stageCounts[a] > stageCounts[b] ? a : b
  ) || 'Design'
}

export function estimateCompletion(items: ProductionItem[]): Date {
  const overallProgress = calculateOverallProgress(items)
  const remainingProgress = 100 - overallProgress
  
  // Simple estimation: ~10% progress per day
  // In a real system, this would use historical data and item complexity
  const daysToComplete = Math.max(1, Math.round(remainingProgress / 10))
  
  const estimatedDate = new Date()
  estimatedDate.setDate(estimatedDate.getDate() + daysToComplete)
  
  return estimatedDate
}

export function getStageStatus(
  item: ProductionItem, 
  stage: string
): 'completed' | 'in-progress' | 'pending' {
  const stageData = item.stages[stage]
  
  if (!stageData || stageData.progress === 0) return 'pending'
  if (stageData.progress === 100 && stageData.completed_at) return 'completed'
  return 'in-progress'
}

export function getStageProgress(
  items: ProductionItem[], 
  stage: string
): number {
  if (items.length === 0) return 0
  
  // Calculate weighted average progress for a stage across all items
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const weightedProgress = items.reduce(
    (sum, item) => {
      const stageProgress = item.stages[stage]?.progress || 0
      return sum + (stageProgress * item.quantity)
    }, 
    0
  )
  
  return Math.round(weightedProgress / totalQuantity)
}

export function formatProductionTime(date: string | Date): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  
  const diffTime = now.getTime() - targetDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return '1 day ago'
  } else if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 0) {
    // Future date
    const futureDays = Math.abs(diffDays)
    if (futureDays === 1) {
      return 'Tomorrow'
    } else if (futureDays < 7) {
      return `In ${futureDays} days`
    } else {
      return targetDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } else {
    return targetDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

export function calculateItemProgress(stages: Record<string, { progress: number }>): number {
  const totalStages = PRODUCTION_STAGES.length
  const totalProgress = PRODUCTION_STAGES.reduce(
    (sum, stage) => sum + (stages[stage]?.progress || 0), 
    0
  )
  
  return Math.round(totalProgress / totalStages)
}

export function findCurrentStage(stages: Record<string, { progress: number; completed_at?: string }>): string {
  // Find the first stage that is not completed
  for (const stage of PRODUCTION_STAGES) {
    const stageData = stages[stage]
    if (!stageData || stageData.progress < 100 || !stageData.completed_at) {
      return stage
    }
  }
  
  // All stages completed, return last stage
  return PRODUCTION_STAGES[PRODUCTION_STAGES.length - 1]
}

export function getNextStage(currentStage: string): string | null {
  const currentIndex = PRODUCTION_STAGES.indexOf(currentStage)
  if (currentIndex === -1 || currentIndex === PRODUCTION_STAGES.length - 1) {
    return null
  }
  
  return PRODUCTION_STAGES[currentIndex + 1]
}

export function getPreviousStage(currentStage: string): string | null {
  const currentIndex = PRODUCTION_STAGES.indexOf(currentStage)
  if (currentIndex <= 0) {
    return null
  }
  
  return PRODUCTION_STAGES[currentIndex - 1]
}

export function isStageCompleted(stages: Record<string, { progress: number; completed_at?: string }>, stage: string): boolean {
  const stageData = stages[stage]
  return !!(stageData && stageData.progress === 100 && stageData.completed_at)
}

export function getCompletedStagesCount(stages: Record<string, { progress: number; completed_at?: string }>): number {
  return PRODUCTION_STAGES.filter(stage => isStageCompleted(stages, stage)).length
}

export function getProgressColor(progress: number): string {
  if (progress === 0) return 'bg-gray-200'
  if (progress < 30) return 'bg-red-400'
  if (progress < 60) return 'bg-yellow-400'
  if (progress < 90) return 'bg-blue-400'
  return 'bg-green-400'
}

export function getStageIcon(stage: string): string {
  // Return the appropriate Lucide React icon name
  const iconMap: Record<string, string> = {
    'Design': 'Palette',
    'Cutting': 'Scissors',
    'Assembly': 'Hammer',
    'Finishing': 'Sparkles',
    'QC': 'CheckCircle2',
    'Packaging': 'Package'
  }
  
  return iconMap[stage] || 'Circle'
}

export function getStageColor(stage: string): { bg: string; text: string; light: string } {
  const colorMap: Record<string, { bg: string; text: string; light: string }> = {
    'Design': { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-100' },
    'Cutting': { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' },
    'Assembly': { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100' },
    'Finishing': { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' },
    'QC': { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' },
    'Packaging': { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-100' }
  }
  
  return colorMap[stage] || { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-100' }
}