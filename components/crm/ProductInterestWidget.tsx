'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'

interface ProductInterest {
  id: string
  lead_id: string
  product_id: string
  product_name: string
  product_image?: string
  interest_level: 'low' | 'medium' | 'high'
  notes?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  image_url?: string
}

export default function ProductInterestWidget({ leadId }: { leadId: string }) {
  const [interests, setInterests] = useState<ProductInterest[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const loadProductInterests = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/products`)
      if (res.ok) {
        const data = await res.json()
        setInterests(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load product interests:', error)
    }
  }, [leadId])

  const loadAvailableProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=50')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }, [])

  useEffect(() => {
    loadProductInterests()
    loadAvailableProducts()
  }, [loadProductInterests, loadAvailableProducts])

  const addProductInterest = async (productId: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, interest_level: 'medium' })
      })

      if (res.ok) {
        loadProductInterests()
        setShowAddProduct(false)
      }
    } catch (error) {
      console.error('Failed to add product interest:', error)
    }
  }

  const removeProductInterest = async (interestId: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/products/${interestId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadProductInterests()
      }
    } catch (error) {
      console.error('Failed to remove product interest:', error)
    }
  }

  const getInterestColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Product Interests</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddProduct(!showAddProduct)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {interests.map(interest => (
            <div key={interest.id} className="relative group">
              <div className="border rounded-lg p-2">
                {interest.product_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={interest.product_image}
                    alt={interest.product_name}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                )}
                <p className="text-xs font-medium truncate">{interest.product_name}</p>
                <Badge
                  variant="secondary"
                  className={`text-xs mt-1 ${getInterestColor(interest.interest_level)}`}
                >
                  {interest.interest_level}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeProductInterest(interest.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {showAddProduct && (
          <div className="mt-4 p-3 border rounded-lg bg-gray-50">
            <p className="text-sm font-medium mb-2">Add Product Interest</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {products.filter(p => !interests.find(i => i.product_id === p.id)).map(product => (
                <Button
                  key={product.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => addProductInterest(product.id)}
                >
                  {product.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {interests.length === 0 && !showAddProduct && (
          <p className="text-xs text-gray-500 text-center py-4">
            No products selected
          </p>
        )}
      </CardContent>
    </Card>
  )
}