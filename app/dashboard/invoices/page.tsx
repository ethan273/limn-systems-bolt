'use client'

import { useState } from 'react'
import { Receipt, Plus, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SignatureTracker } from '@/components/pandadoc/SignatureTracker'
import { InvoiceCreator } from '@/components/pandadoc/InvoiceCreator'

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('view')

  const handleInvoiceSuccess = (invoice: unknown) => {
    console.log('Invoice created:', invoice)
    // Switch to view tab to see the new invoice
    setActiveTab('view')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Invoices
        </h1>
        <p className="text-gray-700 text-lg">
          Create, send, and track invoices through PandaDoc integration.
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Invoice Management
            </CardTitle>
            <Button onClick={() => setActiveTab('create')}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="view" className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                View Invoices
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="space-y-4">
              <SignatureTracker documentType="invoice" />
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <InvoiceCreator onSuccess={handleInvoiceSuccess} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}