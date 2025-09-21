'use client'

import { useState } from 'react'
import { FileText, Receipt, FileSignature, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SignatureTracker } from '@/components/pandadoc/SignatureTracker'
import { InvoiceCreator } from '@/components/pandadoc/InvoiceCreator'

export default function PandaDocPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const handleInvoiceSuccess = (invoice: unknown) => {
    console.log('Invoice created:', invoice)
    // Switch to tracker tab to see the new invoice
    setActiveTab('tracker')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          PandaDoc Integration
        </h1>
        <p className="text-gray-700 text-lg">
          Create and manage legal documents, invoices, and track signatures through PandaDoc.
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileSignature className="w-5 h-5 mr-2" />
              Document Management
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard" className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Document Tracker
              </TabsTrigger>
              <TabsTrigger value="create-invoice" className="flex items-center">
                <Receipt className="h-4 w-4 mr-2" />
                Create Invoice
              </TabsTrigger>
              <TabsTrigger value="tracker" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                All Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mb-4">
                  <FileSignature className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">PandaDoc Integration</h2>
                <p className="text-slate-900 mb-6">
                  Streamline your document workflow with automated creation and signature tracking
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('create-invoice')}>
                    <CardContent className="p-6 text-center">
                      <Receipt className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Create Invoice</h3>
                      <p className="text-sm text-slate-900">
                        Generate professional invoices with automated PandaDoc templates
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('tracker')}>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Track Documents</h3>
                      <p className="text-sm text-slate-900">
                        Monitor signature status and document progress in real-time
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow opacity-75">
                    <CardContent className="p-6 text-center">
                      <FileSignature className="h-12 w-12 text-slate-900 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Legal Documents</h3>
                      <p className="text-sm text-slate-900">
                        NDAs, MSAs, and contracts (coming soon)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="create-invoice" className="space-y-4">
              <InvoiceCreator onSuccess={handleInvoiceSuccess} />
            </TabsContent>

            <TabsContent value="tracker" className="space-y-4">
              <SignatureTracker />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}