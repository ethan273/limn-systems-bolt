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
import { DesignBrief } from '@/types/designer';
import { Plus, X, DollarSign, Ruler, Palette, Target } from 'lucide-react';

interface DesignBriefEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief?: DesignBrief | null;
  onSave: (briefData: Partial<DesignBrief>) => Promise<void>;
}

export default function DesignBriefEditModal({ 
  isOpen, 
  onClose, 
  brief, 
  onSave 
}: DesignBriefEditModalProps) {
  const [formData, setFormData] = useState<Partial<DesignBrief>>({
    title: '',
    description: '',
    target_market: '',
    price_point_min: 0,
    price_point_max: 0,
    materials_preference: [],
    style_references: [],
    functional_requirements: '',
    sustainability_requirements: '',
    dimensional_constraints: {}
  });
  
  const [newMaterial, setNewMaterial] = useState('');
  const [newStyleRef, setNewStyleRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (brief) {
      setFormData({
        title: brief.title || '',
        description: brief.description || '',
        target_market: brief.target_market || '',
        price_point_min: brief.price_point_min || 0,
        price_point_max: brief.price_point_max || 0,
        materials_preference: brief.materials_preference || [],
        style_references: brief.style_references || [],
        functional_requirements: brief.functional_requirements || '',
        sustainability_requirements: brief.sustainability_requirements || '',
        dimensional_constraints: brief.dimensional_constraints || {}
      });
    } else {
      setFormData({
        title: '',
        description: '',
        target_market: '',
        price_point_min: 0,
        price_point_max: 0,
        materials_preference: [],
        style_references: [],
        functional_requirements: '',
        sustainability_requirements: '',
        dimensional_constraints: {}
      });
    }
    setErrors({});
  }, [brief, isOpen]);

  const addMaterial = () => {
    if (newMaterial.trim() && !formData.materials_preference?.includes(newMaterial.trim())) {
      setFormData(prev => ({
        ...prev,
        materials_preference: [...(prev.materials_preference || []), newMaterial.trim()]
      }));
      setNewMaterial('');
    }
  };

  const removeMaterial = (material: string) => {
    setFormData(prev => ({
      ...prev,
      materials_preference: prev.materials_preference?.filter(m => m !== material) || []
    }));
  };

  const addStyleRef = () => {
    if (newStyleRef.trim() && !formData.style_references?.includes(newStyleRef.trim())) {
      setFormData(prev => ({
        ...prev,
        style_references: [...(prev.style_references || []), newStyleRef.trim()]
      }));
      setNewStyleRef('');
    }
  };

  const removeStyleRef = (styleRef: string) => {
    setFormData(prev => ({
      ...prev,
      style_references: prev.style_references?.filter(s => s !== styleRef) || []
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.price_point_min && formData.price_point_max && formData.price_point_min > formData.price_point_max) {
      newErrors.price_point = 'Minimum price cannot be greater than maximum price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      await onSave({
        ...formData,
        updated_at: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Error saving design brief:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'material' | 'style') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'material') {
        addMaterial();
      } else {
        addStyleRef();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {brief ? 'Edit Design Brief' : 'Create Design Brief'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brief Title *
                </label>
                <Input
                  placeholder="Enter design brief title..."
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <Textarea
                  placeholder="Describe the design requirements, style, and vision..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={errors.description ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Market
                </label>
                <Textarea
                  placeholder="Describe the target customer segment and market..."
                  value={formData.target_market || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_market: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Price Range</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Price
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.price_point_min || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_point_min: parseFloat(e.target.value) || 0 }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Price
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.price_point_max || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_point_max: parseFloat(e.target.value) || 0 }))}
                    className={`pl-10 ${errors.price_point ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
            </div>
            {errors.price_point && (
              <p className="text-sm text-red-600">{errors.price_point}</p>
            )}
          </div>

          {/* Materials */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Materials Preference</h4>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add material preference..."
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'material')}
                />
                <Button onClick={addMaterial} type="button" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.materials_preference && (formData.materials_preference || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(formData.materials_preference || []).map((material, index) => (
                    <Badge key={index} variant="secondary" className="px-2 py-1">
                      {material}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMaterial(material)}
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

          {/* Style References */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Style References</h4>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add style reference or inspiration..."
                  value={newStyleRef}
                  onChange={(e) => setNewStyleRef(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'style')}
                />
                <Button onClick={addStyleRef} type="button" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.style_references && (formData.style_references || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(formData.style_references || []).map((styleRef, index) => (
                    <Badge key={index} variant="outline" className="px-2 py-1">
                      {styleRef}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStyleRef(styleRef)}
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

          {/* Requirements */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Requirements</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="inline h-4 w-4 mr-1" />
                  Functional Requirements
                </label>
                <Textarea
                  placeholder="Describe functional needs, usability requirements, performance criteria..."
                  value={formData.functional_requirements || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, functional_requirements: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sustainability Requirements
                </label>
                <Textarea
                  placeholder="Environmental considerations, sustainable materials, eco-friendly practices..."
                  value={formData.sustainability_requirements || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sustainability_requirements: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Dimensional Constraints */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">
              <Ruler className="inline h-4 w-4 mr-1" />
              Dimensional Constraints
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Width
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={(formData.dimensional_constraints as Record<string, unknown>)?.max_width as string || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dimensional_constraints: { 
                      ...(prev.dimensional_constraints as Record<string, unknown>), 
                      max_width: parseFloat(e.target.value) || undefined 
                    }
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Height
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={(formData.dimensional_constraints as Record<string, unknown>)?.max_height as string || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dimensional_constraints: { 
                      ...(prev.dimensional_constraints as Record<string, unknown>), 
                      max_height: parseFloat(e.target.value) || undefined 
                    }
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Depth
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={(formData.dimensional_constraints as Record<string, unknown>)?.max_depth as string || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dimensional_constraints: { 
                      ...(prev.dimensional_constraints as Record<string, unknown>), 
                      max_depth: parseFloat(e.target.value) || undefined 
                    }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (brief ? 'Update Brief' : 'Create Brief')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}