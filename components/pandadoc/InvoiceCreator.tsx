'use client'

import { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Send,
  Calendar,
  Building,
  Hash,
  FileText,
  Loader
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Customer {
  id: string;
  name: string;
  email?: string;
  company_name?: string;
}

interface LineItem {
  description: string;
  details: string;
  quantity: number;
  price: number;
  item_code: string;
  unit: string;
}

interface InvoiceData {
  invoice_number: string;
  customer_id: string;
  order_id: string;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  billing_contact_first: string;
  billing_contact_last: string;
  billing_email: string;
  billing_phone: string;
  po_number: string;
  invoice_date: string;
  payment_terms: number;
  tax_rate: number;
  discount: number;
  notes: string;
  auto_send: boolean;
}

interface InvoiceCreatorProps {
  customerId?: string | null;
  orderId?: string | null;
  onSuccess?: (invoice: unknown) => void;
}

export function InvoiceCreator({ customerId = null, orderId = null, onSuccess }: InvoiceCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', details: '', quantity: 1, price: 0, item_code: '', unit: 'each' }
  ]);
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoice_number: '',
    customer_id: customerId || '',
    order_id: orderId || '',
    customer_name: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    customer_zip: '',
    billing_contact_first: '',
    billing_contact_last: '',
    billing_email: '',
    billing_phone: '',
    po_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_terms: 30,
    tax_rate: 0.0875, // 8.75% default
    discount: 0,
    notes: '',
    auto_send: true
  });

  useEffect(() => {
    generateInvoiceNumber();
    if (customerId) {
      fetchCustomerDetails(customerId);
    }
    loadCustomers();
  }, [customerId]);

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const invoiceNumber = `INV-${year}${month}-${random}`;
    
    setInvoiceData(prev => ({ ...prev, invoice_number: invoiceNumber }));
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers', {
        credentials: 'include'
      });
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        credentials: 'include'
      });
      const { data: customer } = await response.json();
      
      if (customer) {
        setInvoiceData(prev => ({
          ...prev,
          customer_name: customer.name || '',
          customer_address: customer.address || '',
          customer_city: customer.city || '',
          customer_state: customer.state || '',
          customer_zip: customer.zip || '',
          billing_email: customer.email || '',
          billing_phone: customer.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      description: '',
      details: '',
      quantity: 1,
      price: 0,
      item_code: '',
      unit: 'each'
    }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * invoiceData.tax_rate;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax - invoiceData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...invoiceData,
        line_items: lineItems.filter(item => (item.description || "").trim() !== ''),
        subtotal: calculateSubtotal(),
        tax_amount: calculateTax(),
        total_amount: calculateTotal()
      };

      const response = await fetch('/api/pandadoc/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess?.(result.data);
        // Reset form or redirect
      } else {
        throw new Error(result.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary" />
            Create PandaDoc Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-heading mb-1">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceData.invoice_number}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-heading mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceData.invoice_date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-heading mb-1">
                <Building className="w-4 h-4 inline mr-1" />
                Customer
              </label>
              <select
                value={invoiceData.customer_id}
                onChange={(e) => {
                  const customerId = e.target.value;
                  setInvoiceData(prev => ({ ...prev, customer_id: customerId }));
                  if (customerId) fetchCustomerDetails(customerId);
                }}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer: Customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-heading">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Line Items
                </h3>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-graphite mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                          placeholder="Item description"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1">Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateLineItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        >
                          <option value="each">Each</option>
                          <option value="hours">Hours</option>
                          <option value="sq ft">Sq Ft</option>
                          <option value="linear ft">Linear Ft</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        {lineItems.length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Totals */}
            <Card className="bg-glacier-50">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-graphite">Subtotal:</span>
                    <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-graphite">Tax ({(invoiceData.tax_rate * 100).toFixed(2)}%):</span>
                    <span className="font-medium">${calculateTax().toFixed(2)}</span>
                  </div>
                  {invoiceData.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-graphite">Discount:</span>
                      <span className="font-medium text-green-600">-${invoiceData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span className="text-heading">Total:</span>
                    <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Create & Send Invoice
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}