'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// cn utility removed as unused
import {
  CalendarIcon,
  DollarSign,
  User,
  Building,
  Target,
  X
} from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  customerId: string;
  contactId?: string;
  assignedTo?: string;
  source: string;
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  customerId: string;
}

interface DealStage {
  id: string;
  name: string;
  probability: number;
  color: string;
}

// Default deal stages - these could also come from API in the future
const defaultStages: DealStage[] = [
  { id: '1', name: 'Lead', probability: 10, color: '#94a3b8' },
  { id: '2', name: 'Qualified', probability: 25, color: '#60a5fa' },
  { id: '3', name: 'Proposal', probability: 50, color: '#fbbf24' },
  { id: '4', name: 'Negotiation', probability: 75, color: '#fb923c' },
  { id: '5', name: 'Won', probability: 100, color: '#4ade80' },
  { id: '6', name: 'Lost', probability: 0, color: '#f87171' }
];

const dealSources = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Trade Show',
  'Partner',
  'Other'
];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
];

interface DealEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: Deal | null;
  onSave: (deal: Partial<Deal>) => void;
}

export default function DealEditModal({ 
  isOpen, 
  onClose, 
  deal, 
  onSave 
}: DealEditModalProps) {
  const [formData, setFormData] = useState<Partial<Deal>>({
    title: '',
    description: '',
    value: 0,
    currency: 'USD',
    stage: '1',
    probability: 10,
    customerId: '',
    contactId: '',
    assignedTo: '',
    source: 'Website',
    tags: [],
    notes: ''
  });
  const [newTag, setNewTag] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Real data from APIs
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages] = useState<DealStage[]>(defaultStages);
  const [loadingData, setLoadingData] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);  // loadData is stable

  useEffect(() => {
    if (deal) {
      setFormData({
        ...deal,
        expectedCloseDate: undefined // Handle separately
      });
      setExpectedCloseDate(deal.expectedCloseDate);
    } else {
      // Reset form for new deal
      setFormData({
        title: '',
        description: '',
        value: 0,
        currency: 'USD',
        stage: '1',
        probability: 10,
        customerId: '',
        contactId: '',
        assignedTo: '',
        source: 'Website',
        tags: [],
        notes: ''
      });
      setExpectedCloseDate(undefined);
    }
    setErrors({});
  }, [deal, isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Load customers and contacts in parallel
      const [customersResponse, contactsResponse] = await Promise.all([
        fetch('/api/customers', { credentials: 'include' }),
        fetch('/api/contacts', { credentials: 'include' })
      ]);

      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        setCustomers(customersData.data || []);
      } else {
        console.error('Failed to load customers');
        setCustomers([]);
      }

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        setContacts(contactsData.data || []);
      } else {
        console.error('Failed to load contacts');
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setCustomers([]);
      setContacts([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleStageChange = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    setFormData(prev => ({
      ...prev,
      stage: stageId,
      probability: stage?.probability || 0
    }));
  };

  const handleCustomerChange = (customerId: string) => {
    setFormData(prev => ({
      ...prev,
      customerId,
      contactId: '' // Reset contact when customer changes
    }));
  };

  const getCustomerContacts = (customerId: string) => {
    return contacts.filter(contact => contact.customerId === customerId);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Deal title is required';
    }
    
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }
    
    if (!formData.value || formData.value <= 0) {
      newErrors.value = 'Deal value must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const dealData = {
        ...formData,
        expectedCloseDate,
        updatedAt: new Date()
      };
      
      if (!deal) {
        dealData.createdAt = new Date();
      }
      
      await onSave(dealData);
      onClose();
    } catch (error) {
      console.error('Error saving deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const customerContacts = selectedCustomer ? getCustomerContacts(selectedCustomer.id) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {deal ? 'Edit Deal' : 'Create New Deal'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Title *
                </label>
                <Input
                  placeholder="Enter deal title..."
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  placeholder="Enter deal description..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Deal Value & Stage */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Value & Stage</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Value *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.value || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    className={`pl-10 ${errors.value ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.value && (
                  <p className="text-sm text-red-600 mt-1">{errors.value}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Stage
                </label>
                <Select
                  value={formData.stage}
                  onValueChange={handleStageChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win Probability
                </label>
                <div className="space-y-2">
                  <Progress value={formData.probability} className="h-3" />
                  <div className="text-sm text-gray-600 text-center">
                    {formData.probability}% chance
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Customer & Contact</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <Select
                  value={formData.customerId}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger className={errors.customerId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={loadingData ? "Loading customers..." : "Select customer..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          {customer.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && (
                  <p className="text-sm text-red-600 mt-1">{errors.customerId}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Contact
                </label>
                <Select
                  value={formData.contactId || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contactId: value }))}
                  disabled={!formData.customerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Loading contacts..." : "Select contact..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerContacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {contact.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Timeline & Source */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Timeline & Source</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Close Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={expectedCloseDate ? expectedCloseDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setExpectedCloseDate(e.target.value ? new Date(e.target.value) : undefined)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Source
                </label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dealSources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Tags</h4>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button onClick={addTag} type="button">
                  Add
                </Button>
              </div>
              
              {formData.tags && (formData.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(formData.tags || []).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="px-2 py-1">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTag(tag)}
                        className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Notes</h4>
            
            <Textarea
              placeholder="Add notes about this deal..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (deal ? 'Update Deal' : 'Create Deal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}