'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calculator, DollarSign, Repeat, Clock, Target, TrendingUp } from 'lucide-react'

interface CLVCalculatorProps {
  title?: string
  initialValues?: {
    averageOrderValue: number
    purchaseFrequency: number
    customerLifespan: number
  }
}

export function CLVCalculator({ 
  title = "Customer Lifetime Value Calculator",
  initialValues = {
    averageOrderValue: 12500,
    purchaseFrequency: 0.8,
    customerLifespan: 5
  }
}: CLVCalculatorProps) {
  
  const [aov, setAov] = useState(initialValues.averageOrderValue)
  const [frequency, setFrequency] = useState(initialValues.purchaseFrequency)
  const [lifespan, setLifespan] = useState(initialValues.customerLifespan)
  const [showImpact, setShowImpact] = useState(false)

  // Calculate CLV
  const clv = aov * frequency * lifespan

  // Calculate CLV with 10% improvement scenarios
  const scenarios = [
    {
      name: 'Increase AOV by 10%',
      icon: DollarSign,
      newClv: (aov * 1.1) * frequency * lifespan,
      change: 'aov',
      improvement: 0.1
    },
    {
      name: 'Increase Frequency by 10%',
      icon: Repeat,
      newClv: aov * (frequency * 1.1) * lifespan,
      change: 'frequency',
      improvement: 0.1
    },
    {
      name: 'Extend Lifespan by 10%',
      icon: Clock,
      newClv: aov * frequency * (lifespan * 1.1),
      change: 'lifespan',
      improvement: 0.1
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getCLVRating = (clvValue: number) => {
    if (clvValue >= 100000) return { label: 'Excellent', color: 'bg-green-100 text-green-800', description: 'Top-tier customer value' }
    if (clvValue >= 50000) return { label: 'Very Good', color: 'bg-blue-100 text-blue-800', description: 'High-value customer' }
    if (clvValue >= 25000) return { label: 'Good', color: 'bg-purple-100 text-purple-800', description: 'Solid customer value' }
    if (clvValue >= 10000) return { label: 'Fair', color: 'bg-yellow-100 text-yellow-800', description: 'Average customer value' }
    return { label: 'Poor', color: 'bg-red-100 text-red-800', description: 'Low customer value' }
  }

  const rating = getCLVRating(clv)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Interactive calculator to understand customer lifetime value impact
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="aov" className="text-sm font-medium">
              Average Order Value
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <Input
                id="aov"
                type="number"
                value={aov}
                onChange={(e) => setAov(Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="12,500"
              />
            </div>
            <p className="text-xs text-gray-500">Average revenue per order</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-sm font-medium">
              Purchase Frequency (per year)
            </Label>
            <div className="relative">
              <Repeat className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <Input
                id="frequency"
                type="number"
                step="0.1"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="0.8"
              />
            </div>
            <p className="text-xs text-gray-500">Orders per customer per year</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifespan" className="text-sm font-medium">
              Customer Lifespan (years)
            </Label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <Input
                id="lifespan"
                type="number"
                step="0.5"
                value={lifespan}
                onChange={(e) => setLifespan(Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="5"
              />
            </div>
            <p className="text-xs text-gray-500">Expected relationship duration</p>
          </div>
        </div>

        {/* CLV Result */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Customer Lifetime Value</h3>
            </div>
            <Badge className={`${rating.color} border-0 text-sm px-3 py-1`}>
              {rating.label}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(clv)}
            </div>
            <p className="text-sm text-gray-600">{rating.description}</p>
            <div className="text-xs text-gray-500">
              Formula: {formatCurrency(aov)} × {frequency} × {lifespan} years
            </div>
          </div>
        </div>

        {/* Improvement Scenarios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-900">Impact of 10% Improvements</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImpact(!showImpact)}
            >
              {showImpact ? 'Hide' : 'Show'} Impact Analysis
            </Button>
          </div>

          {showImpact && (
            <div className="grid grid-cols-1 gap-4">
              {scenarios.map((scenario, index) => {
                const impact = scenario.newClv - clv
                const impactPercentage = (impact / clv) * 100
                const Icon = scenario.icon
                
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {scenario.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          New CLV: {formatCurrency(scenario.newClv)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          +{formatCurrency(impact)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        (+{impactPercentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Industry Benchmarks */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Furniture Industry Benchmarks
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Average AOV</div>
              <div className="font-medium">$8,000 - $15,000</div>
            </div>
            <div>
              <div className="text-gray-600">Purchase Frequency</div>
              <div className="font-medium">0.5 - 1.2 per year</div>
            </div>
            <div>
              <div className="text-gray-600">Customer Lifespan</div>
              <div className="font-medium">3 - 7 years</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}