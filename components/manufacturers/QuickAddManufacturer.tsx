'use client'

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickAddManufacturerProps {
  onManufacturerAdded?: () => void;
  trigger?: React.ReactNode;
}

interface ManufacturerFormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  status: 'prospect' | 'approved' | 'preferred' | 'suspended';
  capabilities: string[];
  notes: string;
}

const CAPABILITIES_OPTIONS = [
  { value: 'steel_fabrication', label: 'Steel Fabrication' },
  { value: 'aluminum_fabrication', label: 'Aluminum Fabrication' },
  { value: 'welding', label: 'Welding' },
  { value: 'machining', label: 'Machining' },
  { value: 'powder_coating', label: 'Powder Coating' },
  { value: 'anodizing', label: 'Anodizing' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'laser_cutting', label: 'Laser Cutting' },
  { value: 'cnc_machining', label: 'CNC Machining' },
  { value: 'sheet_metal', label: 'Sheet Metal Work' },
  { value: 'casting', label: 'Casting' }
];

export function QuickAddManufacturer({ onManufacturerAdded, trigger }: QuickAddManufacturerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ManufacturerFormData>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    status: 'prospect',
    capabilities: [],
    notes: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ManufacturerFormData, string>>>({});

;

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ManufacturerFormData, string>> = {};

    if (!(formData.company_name || "").trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!(formData.contact_name || "").trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    if (!(formData.email || "").trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!(formData.phone || "").trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if ((formData.capabilities || []).length === 0) {
      newErrors.capabilities = 'Please select at least one capability';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // In production, this would create the manufacturer in Supabase

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success toast
      toast.success('Manufacturer added successfully', {
        description: `${formData.company_name} has been added to your manufacturers list.`
      });

      // Reset form
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        },
        status: 'prospect',
        capabilities: [],
        notes: ''
      });

      // Close dialog
      setOpen(false);

      // Callback to refresh parent component
      if (onManufacturerAdded) {
        onManufacturerAdded();
      }

    } catch (error) {
      console.error('Error creating manufacturer:', error);
      toast.error('Failed to add manufacturer', {
        description: 'Please try again or contact support if the problem persists.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCapabilityChange = (capability: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      capabilities: checked
        ? [...prev.capabilities, capability]
        : (prev.capabilities || []).filter(cap => cap !== capability)
    }));
    
    // Clear capability error if at least one is selected
    if (checked && errors.capabilities) {
      setErrors(prev => ({ ...prev, capabilities: undefined }));
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Manufacturer
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Manufacturer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className={errors.company_name ? 'border-red-300' : ''}
                />
                {errors.company_name && (
                  <p className="text-sm text-red-600">{errors.company_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  className={errors.contact_name ? 'border-red-300' : ''}
                />
                {errors.contact_name && (
                  <p className="text-sm text-red-600">{errors.contact_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={errors.email ? 'border-red-300' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className={errors.phone ? 'border-red-300' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Address</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value }
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.address.zip}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, zip: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.address.country}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, country: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="MX">Mexico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Classification</h3>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'prospect' | 'approved' | 'preferred' | 'suspended') => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Capabilities *</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CAPABILITIES_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={(formData.capabilities || "").includes(option.value)}
                    onCheckedChange={(checked) => 
                      handleCapabilityChange(option.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.capabilities && (
              <p className="text-sm text-red-600">{errors.capabilities}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Initial Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this manufacturer..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manufacturer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}