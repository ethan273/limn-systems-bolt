'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  Minus, 
  X,
  CheckCircle,
  User,
  MapPin,
  FileText,
  AlertCircle
} from 'lucide-react';
import { safeFormatString } from '@/lib/utils/string-helpers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  lead_time_days: number;
  minimum_quantity: number;
  description: string;
}

interface OrderItem extends Item {
  quantity: number;
  customization?: string;
}

interface OrderForm {
  // Customer Information
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  
  // Billing Address
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  
  // Shipping Address
  sameAsBilling: boolean;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  
  // Order Details
  orderType: 'standard' | 'custom' | 'rush';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedDelivery: string;
  projectName: string;
  specialInstructions: string;
  referralSource: string;
  
  // Items
  items: OrderItem[];
}

export default function PublicOrderForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const [formData, setFormData] = useState<OrderForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    companyName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'United States',
    sameAsBilling: true,
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'United States',
    orderType: 'standard',
    priority: 'medium',
    requestedDelivery: '',
    projectName: '',
    specialInstructions: '',
    referralSource: '',
    items: []
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const response = await fetch('/api/items?simple=true');
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
      // Mock data fallback for demo
      setItems([
        {
          id: '1',
          sku: 'TC-001',
          name: 'Precision Titanium Component',
          category: 'components',
          price: 850.00,
          lead_time_days: 14,
          minimum_quantity: 1,
          description: 'High-precision titanium component for aerospace applications'
        },
        {
          id: '2',
          sku: 'AA-002',
          name: 'Custom Aerospace Assembly',
          category: 'assemblies',
          price: 750.00,
          lead_time_days: 21,
          minimum_quantity: 1,
          description: 'Custom aerospace assembly with advanced materials'
        },
        {
          id: '3',
          sku: 'SS-003',
          name: 'Stainless Steel Bracket',
          category: 'components',
          price: 125.00,
          lead_time_days: 7,
          minimum_quantity: 5,
          description: 'Marine-grade stainless steel mounting bracket'
        }
      ]);
    }
  }

  function addItemToOrder(item: Item) {
    const existingItem = selectedItems.find(i => i.id === item.id);
    if (existingItem) {
      setSelectedItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setSelectedItems(prev => [...prev, { ...item, quantity: item.minimum_quantity }]);
    }
  }

  function updateItemQuantity(itemId: string, quantity: number) {
    if (quantity === 0) {
      setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setSelectedItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, quantity } : i
      ));
    }
  }

  function updateItemCustomization(itemId: string, customization: string) {
    setSelectedItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, customization } : i
    ));
  }

  function handleInputChange(field: keyof OrderForm, value: unknown) {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-copy billing to shipping when sameAsBilling is true
    if (field === 'sameAsBilling' && value) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: prev.billingAddress,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingZip: prev.billingZip,
        shippingCountry: prev.billingCountry
      }));
    }
  }

  async function handleSubmit() {
    if (selectedItems.length === 0) {
      setError('Please add at least one item to your order.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const orderData = {
        ...formData,
        items: selectedItems
      };

      const response = await fetch('/api/orders/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to submit order');

      setOrderNumber(data.orderNumber);
      setSuccess(true);
    } catch (error: unknown) {
      console.error('Error submitting order:', error);
      setError((error as { message?: string }).message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const maxLeadTime = Math.max(...selectedItems.map(item => item.lead_time_days), 0);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Submitted Successfully!</h1>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for your order. We&apos;ve received your request and will begin processing it shortly.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Your Order Number</p>
              <p className="text-2xl font-bold text-[#1a2b49]">{orderNumber}</p>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• A confirmation email has been sent to {formData.customerEmail}</p>
              <p>• Expected lead time: {maxLeadTime} business days</p>
              <p>• We&apos;ll contact you within 24 hours to confirm details</p>
            </div>
            <div className="flex justify-center space-x-4 mt-8">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Return Home
              </Button>
              <Button
                onClick={() => router.push(`/orders/${orderNumber}`)}
                className="bg-[#1a2b49] hover:bg-[#243150]"
              >
                View Order Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, name: 'Select Items', icon: Package },
    { id: 2, name: 'Customer Info', icon: User },
    { id: 3, name: 'Order Details', icon: FileText },
    { id: 4, name: 'Review & Submit', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1a2b49] mb-2">Place Your Order</h1>
          <p className="text-gray-600">Custom precision manufacturing for your business needs</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive 
                        ? 'border-[#1a2b49] bg-[#1a2b49] text-white' 
                        : isCompleted
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      isActive 
                        ? 'text-[#1a2b49]' 
                        : isCompleted 
                          ? 'text-green-600'
                          : 'text-gray-400'
                    }`}>
                      {step.name}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-0.5 mx-4 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Step 1: Select Items */}
          {currentStep === 1 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Items</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Items</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {items.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addItemToOrder(item)}
                            className="bg-[#1a2b49] hover:bg-[#243150]"
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold">${item.price.toFixed(2)}</span>
                          <span className="text-gray-600">{item.lead_time_days} day lead time</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Min. quantity: {item.minimum_quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Selected Items ({selectedItems.length})
                  </h3>
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No items selected yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedItems.map(item => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, 0)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateItemQuantity(item.id, Math.max(item.minimum_quantity, item.quantity - 1))}
                                className="w-6 h-6 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="px-3 py-1 bg-gray-100 rounded">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                              <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                            </div>
                          </div>
                          
                          <Textarea
                            placeholder="Special instructions or customization notes..."
                            value={item.customization || ''}
                            onChange={(e) => updateItemCustomization(item.id, e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      ))}
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">Subtotal:</span>
                          <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Estimated lead time: {maxLeadTime} business days
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Customer Information */}
          {currentStep === 2 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Information</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Contact Details
                  </h3>
                  
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</Label>
                    <Input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</Label>
                    <Input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</Label>
                    <Input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Company Name</Label>
                    <Input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Billing Address
                  </h3>
                  
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</Label>
                    <Input
                      type="text"
                      value={formData.billingAddress}
                      onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-1">City *</Label>
                      <Input
                        type="text"
                        value={formData.billingCity}
                        onChange={(e) => handleInputChange('billingCity', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-1">State *</Label>
                      <Input
                        type="text"
                        value={formData.billingState}
                        onChange={(e) => handleInputChange('billingState', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</Label>
                      <Input
                        type="text"
                        value={formData.billingZip}
                        onChange={(e) => handleInputChange('billingZip', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-1">Country *</Label>
                      <Select value={formData.billingCountry} onValueChange={(value) => handleInputChange('billingCountry', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.sameAsBilling}
                        onCheckedChange={(checked) => handleInputChange('sameAsBilling', checked)}
                        id="sameAsBilling"
                      />
                      <Label htmlFor="sameAsBilling" className="text-sm text-gray-700">Shipping address same as billing</Label>
                    </div>
                  </div>

                  {!formData.sameAsBilling && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900">Shipping Address</h4>
                      <Input
                        type="text"
                        placeholder="Street Address"
                        value={formData.shippingAddress}
                        onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="text"
                          placeholder="City"
                          value={formData.shippingCity}
                          onChange={(e) => handleInputChange('shippingCity', e.target.value)}
                        />
                        <Input
                          type="text"
                          placeholder="State"
                          value={formData.shippingState}
                          onChange={(e) => handleInputChange('shippingState', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="text"
                          placeholder="ZIP Code"
                          value={formData.shippingZip}
                          onChange={(e) => handleInputChange('shippingZip', e.target.value)}
                        />
                        <Select value={formData.shippingCountry} onValueChange={(value) => handleInputChange('shippingCountry', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="Mexico">Mexico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Order Details */}
          {currentStep === 3 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Details</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Order Type</Label>
                    <Select value={formData.orderType} onValueChange={(value) => handleInputChange('orderType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Order</SelectItem>
                        <SelectItem value="custom">Custom Order</SelectItem>
                        <SelectItem value="rush">Rush Order (+20% fee)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent (+15% fee)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Requested Delivery Date</Label>
                    <Input
                      type="date"
                      value={formData.requestedDelivery}
                      onChange={(e) => handleInputChange('requestedDelivery', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Project Name</Label>
                    <Input
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => handleInputChange('projectName', e.target.value)}
                      placeholder="Optional project or job name"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</Label>
                    <Textarea
                      value={formData.specialInstructions}
                      onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                      placeholder="Any special requirements, specifications, or notes..."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</Label>
                    <Select value={formData.referralSource} onValueChange={(value) => handleInputChange('referralSource', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Please select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Search</SelectItem>
                        <SelectItem value="referral">Word of Mouth</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="trade_show">Trade Show</SelectItem>
                        <SelectItem value="existing_customer">Existing Customer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Order</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Summary */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Items ({selectedItems.length})</h3>
                    {selectedItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 text-lg font-bold">
                      <span>Total:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Estimated Timeline</h4>
                    <p className="text-blue-800">Lead time: {maxLeadTime} business days</p>
                    {formData.requestedDelivery && (
                      <p className="text-blue-800">Requested delivery: {new Date(formData.requestedDelivery).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Customer & Order Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {formData.customerName}</p>
                      <p><strong>Email:</strong> {formData.customerEmail}</p>
                      {formData.customerPhone && <p><strong>Phone:</strong> {formData.customerPhone}</p>}
                      {formData.companyName && <p><strong>Company:</strong> {formData.companyName}</p>}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Billing Address</h3>
                    <div className="text-sm">
                      <p>{formData.billingAddress}</p>
                      <p>{formData.billingCity}, {formData.billingState} {formData.billingZip}</p>
                      <p>{formData.billingCountry}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Type:</strong> {safeFormatString(formData.orderType, 'standard')}</p>
                      <p><strong>Priority:</strong> {formData.priority}</p>
                      {formData.projectName && <p><strong>Project:</strong> {formData.projectName}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => {
                  if (currentStep === 1 && selectedItems.length === 0) {
                    setError('Please select at least one item before continuing.');
                    return;
                  }
                  setError('');
                  setCurrentStep(currentStep + 1);
                }}
                className="bg-[#1a2b49] hover:bg-[#243150]"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-b-transparent border-white" />
                    Submitting...
                  </>
                ) : (
                  'Submit Order'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}