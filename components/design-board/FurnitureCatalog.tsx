'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Search, 
  Filter, 
  Package, 
  Grid3X3, 
  List,
  Ruler
} from 'lucide-react';
import { formatErrorMessage } from '@/lib/error-handling';

interface FurnitureItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  materials?: string[];
  colors?: string[];
  thumbnail_url?: string;
  sku?: string;
  in_stock: boolean;
  created_at: string;
}

interface FurnitureCatalogProps {
  onClose: () => void;
  onAddToBoard: (furniture: FurnitureItem) => void;
}

const FURNITURE_CATEGORIES = [
  'All',
  'Seating',
  'Tables', 
  'Storage',
  'Lighting',
  'Décor',
  'Outdoor'
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' }
];

export function FurnitureCatalog({ onClose, onAddToBoard }: FurnitureCatalogProps) {
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [filteredFurniture, setFilteredFurniture] = useState<FurnitureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);


  // Fetch furniture data
  const fetchFurniture = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch from a furniture/products table
      // For now, we'll create mock data that represents typical furniture items
      const mockFurniture: FurnitureItem[] = [
        {
          id: '1',
          name: 'Modern Office Chair',
          description: 'Ergonomic office chair with lumbar support and premium leather upholstery',
          category: 'Seating',
          subcategory: 'Office Chairs',
          price: 599,
          dimensions: { width: 26, height: 42, depth: 26 },
          materials: ['Leather', 'Steel', 'Foam'],
          colors: ['Black', 'Brown', 'White'],
          sku: 'MOC-001',
          in_stock: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Executive Desk',
          description: 'Solid wood executive desk with built-in storage and cable management',
          category: 'Tables',
          subcategory: 'Desks',
          price: 1299,
          dimensions: { width: 60, height: 30, depth: 30 },
          materials: ['Oak Wood', 'Steel'],
          colors: ['Natural Oak', 'Dark Walnut', 'White Oak'],
          sku: 'ED-002',
          in_stock: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Storage Cabinet',
          description: 'Modular storage cabinet with adjustable shelves and soft-close doors',
          category: 'Storage',
          subcategory: 'Cabinets',
          price: 449,
          dimensions: { width: 36, height: 72, depth: 18 },
          materials: ['MDF', 'Steel Hardware'],
          colors: ['White', 'Gray', 'Black'],
          sku: 'SC-003',
          in_stock: true,
          created_at: new Date().toISOString()
        },
        {
          id: '4',
          name: 'Conference Table',
          description: 'Large conference table for 8-10 people with integrated power outlets',
          category: 'Tables',
          subcategory: 'Conference Tables',
          price: 1899,
          dimensions: { width: 96, height: 30, depth: 48 },
          materials: ['Maple Wood', 'Steel Base'],
          colors: ['Natural Maple', 'Espresso', 'Gray'],
          sku: 'CT-004',
          in_stock: false,
          created_at: new Date().toISOString()
        },
        {
          id: '5',
          name: 'Task Lighting',
          description: 'Adjustable LED desk lamp with wireless charging base',
          category: 'Lighting',
          subcategory: 'Desk Lamps',
          price: 129,
          dimensions: { width: 8, height: 22, depth: 8 },
          materials: ['Aluminum', 'Plastic'],
          colors: ['Silver', 'Black', 'White'],
          sku: 'TL-005',
          in_stock: true,
          created_at: new Date().toISOString()
        }
      ];

      setFurniture(mockFurniture);
      setFilteredFurniture(mockFurniture);
    } catch (err: unknown) {
      console.error('Error fetching furniture:', err);
      setError(formatErrorMessage(err, 'fetch furniture catalog'));
      setFurniture([]);
      setFilteredFurniture([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter and sort furniture
  useEffect(() => {
    let filtered = [...furniture];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredFurniture(filtered);
  }, [furniture, searchQuery, selectedCategory, sortBy]);

  // Initialize data
  useEffect(() => {
    fetchFurniture();
  }, [fetchFurniture]);

  // Format price
  const formatPrice = (price?: number) => {
    if (!price) return 'Price on request';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Format dimensions
  const formatDimensions = (dimensions?: FurnitureItem['dimensions']) => {
    if (!dimensions) return 'Custom sizing';
    return `${dimensions.width}"W × ${dimensions.height}"H × ${dimensions.depth}"D`;
  };

  // Render furniture item in grid view
  const renderGridItem = (item: FurnitureItem) => (
    <div
      key={item.id}
      className="limn-furniture-item cursor-pointer"
      onClick={() => onAddToBoard(item)}
    >
      {/* Thumbnail */}
      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
        {item.thumbnail_url ? (
          <Image 
            src={item.thumbnail_url} 
            alt={`${item.name} - ${item.category} furniture piece`}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <Package className="w-8 h-8 text-slate-400" />
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="limn-furniture-title">{item.name}</h3>
          {!item.in_stock && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
              Out of Stock
            </span>
          )}
        </div>
        
        <p className="limn-furniture-description line-clamp-2">
          {item.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{item.category}</span>
          <span className="font-semibold text-slate-900">
            {formatPrice(item.price)}
          </span>
        </div>
      </div>
    </div>
  );

  // Render furniture item in list view
  const renderListItem = (item: FurnitureItem) => (
    <div
      key={item.id}
      className="flex items-center p-3 border border-slate-200 rounded-lg hover:border-primary hover:bg-glacier-50 cursor-pointer transition-colors"
      onClick={() => onAddToBoard(item)}
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 bg-slate-100 rounded-lg mr-4 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
        {item.thumbnail_url ? (
          <Image 
            src={item.thumbnail_url} 
            alt={`${item.name} - ${item.category} furniture piece`}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <Package className="w-6 h-6 text-slate-400" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-slate-900 text-sm">{item.name}</h3>
          <div className="flex items-center gap-2">
            {!item.in_stock && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                Out of Stock
              </span>
            )}
            <span className="font-bold text-slate-900 text-sm">
              {formatPrice(item.price)}
            </span>
          </div>
        </div>
        
        <p className="text-slate-600 text-xs mb-2 line-clamp-1">
          {item.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{item.category}</span>
          {item.dimensions && (
            <span className="flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              {formatDimensions(item.dimensions)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="w-full h-full limn-panel">
        <CardHeader className="limn-panel-header">
          <CardTitle className="limn-panel-title">Loading Furniture Catalog...</CardTitle>
        </CardHeader>
        <CardContent className="limn-panel-content">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="limn-loading-skeleton h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full limn-panel">
        <CardHeader className="limn-panel-header">
          <div className="flex items-center justify-between">
            <CardTitle className="limn-panel-title">Furniture Catalog</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="limn-panel-content">
          <div className="limn-error">
            {error}
          </div>
          <Button onClick={fetchFurniture} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full limn-panel">
      <CardHeader className="limn-panel-header">
        <div className="flex items-center justify-between">
          <CardTitle className="limn-panel-title">Furniture Catalog</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="limn-panel-content">
        {/* Search and filters */}
        <div className="space-y-4 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search furniture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
          
          {/* Filter controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-slate-600"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
            
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center border border-slate-200 rounded">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none border-none h-8 w-8 p-0"
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-none h-8 w-8 p-0"
                >
                  <List className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Category filters */}
          {showFilters && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 text-sm">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {FURNITURE_CATEGORIES.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="h-7 px-3 text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Results info */}
        <div className="flex items-center justify-between mb-4 text-sm text-slate-600">
          <span>
            {filteredFurniture.length} item{filteredFurniture.length !== 1 ? 's' : ''} found
          </span>
          {selectedCategory !== 'All' && (
            <span>in {selectedCategory}</span>
          )}
        </div>
        
        {/* Furniture grid/list */}
        {filteredFurniture.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
              : 'space-y-3'
          }>
            {filteredFurniture.map(item => 
              viewMode === 'grid' ? renderGridItem(item) : renderListItem(item)
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No furniture found</h3>
            <p className="text-slate-600 text-sm">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'The furniture catalog is currently empty'
              }
            </p>
          </div>
        )}
        
        {/* Usage instructions */}
        <div className="mt-6 p-3 bg-glacier-50 rounded-lg">
          <p className="text-sm text-slate-700">
            <strong>Tip:</strong> Click any furniture item to add it to your design board. 
            You can then resize and position it as needed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}