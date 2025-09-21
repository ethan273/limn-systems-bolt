/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  MapPin,
  ChevronRight,
  Download,
  RefreshCw,
  Info
} from 'lucide-react';
import { safeGet } from '@/lib/utils/bulk-type-fixes';

// ============================================
// PRODUCTION TRACKER COMPONENT
// ============================================

const ProductionTracker = ({ orderId, orderItems = [] }: { orderId: string, orderItems?: unknown[] }) => {
  const [selectedItem, setSelectedItem] = useState<unknown>(null);
  const [trackingData, setTrackingData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  // Production stages configuration
  const stages = [
    { id: 1, name: 'Order Confirmed', icon: CheckCircle, color: 'green' },
    { id: 2, name: 'Materials', icon: Package, color: 'blue' },
    { id: 3, name: 'Production Queue', icon: Clock, color: 'yellow' },
    { id: 4, name: 'In Production', icon: Package, color: 'blue' },
    { id: 5, name: 'Quality Control', icon: CheckCircle, color: 'green' },
    { id: 6, name: 'Finishing', icon: Package, color: 'blue' },
    { id: 7, name: 'Final Inspection', icon: CheckCircle, color: 'green' },
    { id: 8, name: 'Packaging', icon: Package, color: 'purple' },
    { id: 9, name: 'Ready to Ship', icon: Truck, color: 'orange' },
    { id: 10, name: 'Shipped', icon: Truck, color: 'green' }
  ];

  useEffect(() => {
    const fetchProductionData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/production/tracking?orderId=${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch production data');
        
        const data = await response.json();
        setTrackingData(data.trackingData || {});
      } catch (error) {
        console.error('Error fetching production data:', error);
        setTrackingData({});
      } finally {
        setLoading(false);
      }
    };

    if (orderItems.length > 0) {
      fetchProductionData();
    }
  }, [orderId, orderItems]);

  const getStageStatus = (currentStage: number, stageId: number) => {
    if (stageId < currentStage) return 'completed';
    if (stageId === currentStage) return 'current';
    return 'pending';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'red',
      high: 'orange',
      normal: 'blue',
      low: 'gray'
    };
    return colors[priority] || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Production Tracking</h2>
        <p className="text-gray-600">Monitor the production progress of your order items</p>
      </div>

      {/* Order Items List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="font-semibold mb-3">Order Items</h3>
          <div className="space-y-2">
            {orderItems.map((item) => {
              const tracking = trackingData[String(safeGet(item, ['id']) || '')];
              const isSelected = safeGet(selectedItem, ['id']) === safeGet(item, ['id']);
              
              return (
                <div
                  key={String(safeGet(item, ['id']) || '')}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{String(safeGet(item, ['name']) || 'Unknown Item')}</h4>
                      <p className="text-sm text-gray-600">Qty: {Number(safeGet(item, ['quantity']) || 0)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-${getPriorityColor(String(safeGet(tracking, ['priority']) || 'normal'))}-100 text-${getPriorityColor(String(safeGet(tracking, ['priority']) || 'normal'))}-800`}>
                      {String(safeGet(tracking, ['priority']) || '').toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{safeGet(stages[Math.max(0, Number(safeGet(tracking, ['currentStage']) || 1) - 1)], ['name']) || 'Unknown Stage'}</span>
                      <span>{Number(safeGet(tracking, ['progress']) || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${Number(safeGet(tracking, ['progress']) || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Production Timeline */}
        {selectedItem ? (
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">
                Production Timeline: {String(safeGet(selectedItem, ['name']) || 'Unknown Item')}
              </h3>

              {/* Stage Progress */}
              <div className="relative">
                {stages.map((stage, index) => {
                  const tracking = trackingData[String(safeGet(selectedItem, ['id']) || '')];
                  const status = getStageStatus(Number(safeGet(tracking, ['currentStage']) || 1), stage.id);
                  const Icon = stage.icon;
                  
                  return (
                    <div key={stage.id} className="flex items-start mb-6 last:mb-0">
                      {/* Timeline Line */}
                      {index < stages.length - 1 && (
                        <div className={`absolute left-5 top-10 w-0.5 h-full ${
                          status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      )}
                      
                      {/* Stage Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed' 
                          ? 'bg-green-500 text-white' 
                          : status === 'current'
                          ? 'bg-blue-500 text-white animate-pulse'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      {/* Stage Info */}
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-medium ${
                              status === 'current' ? 'text-blue-600' : ''
                            }`}>
                              {stage.name}
                            </h4>
                            {status === 'completed' && (
                              <p className="text-sm text-gray-600 mt-1">
                                Completed on {new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                              </p>
                            )}
                            {status === 'current' && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-600">
                                  Started: {safeGet(tracking, ['startedAt']) ? new Date(String(safeGet(tracking, ['startedAt']))).toLocaleDateString() : 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Est. Completion: {safeGet(tracking, ['estimatedCompletion']) ? new Date(String(safeGet(tracking, ['estimatedCompletion']))).toLocaleDateString() : 'N/A'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Assigned to: {String(safeGet(tracking, ['assignedTo']) || 'N/A')}
                                </p>
                              </div>
                            )}
                          </div>
                          {status === 'current' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              IN PROGRESS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Events */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium mb-3">Recent Updates</h4>
                <div className="space-y-3">
                  {(safeGet(trackingData[String(safeGet(selectedItem, ['id']) || '')], ['events']) as Array<{ title: string; time: Date; user: string }> || [])?.map((event: { title: string; time: Date; user: string }, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-gray-600">
                          {event.time.toLocaleDateString()} by {event.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              {Array.isArray(safeGet(trackingData[String(safeGet(selectedItem, ['id']) || '')], ['photos'])) && (safeGet(trackingData[String(safeGet(selectedItem, ['id']) || '')], ['photos']) as Array<any>)?.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Production Photos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(safeGet(trackingData[String(safeGet(selectedItem, ['id']) || '')], ['photos']) as Array<string> || [])?.map((photo: string, index: number) => (
                      <Image
                        key={index}
                        src={photo}
                        alt={`Production photo ${index + 1}`}
                        width={150}
                        height={150}
                        className="rounded-lg cursor-pointer hover:opacity-90"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ============================================
// SHIPPING TRACKER COMPONENT
// ============================================

const ShippingTracker = ({ shipmentId, orderNumber }: { shipmentId: string, orderNumber: string }) => {
  const [shipmentData, setShipmentData] = useState<{
    trackingNumber: string;
    carrier: string;
    serviceLevel: string;
    status: string;
    shipDate: Date;
    estimatedDelivery: Date;
    actualDelivery: Date | null;
    shipFrom: { city: string; state: string; country: string };
    shipTo: { name: string; address1: string; city: string; state: string; postalCode: string; country: string };
    packages: Array<{ weight: number; dimensions: string }>;
  } | null>(null);
  const [trackingMilestones, setTrackingMilestones] = useState<Array<{
    date: Date;
    description: string;
    location: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Simulate fetching shipping data
    setTimeout(() => {
      setShipmentData({
        trackingNumber: 'LIMN202500123456',
        carrier: 'FedEx',
        serviceLevel: '2 Day',
        status: 'in_transit',
        shipDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        actualDelivery: null,
        shipFrom: {
          city: 'San Francisco',
          state: 'CA',
          country: 'USA'
        },
        shipTo: {
          name: 'John Doe',
          address1: '123 Main St',
          city: 'Denver',
          state: 'CO',
          postalCode: '80202',
          country: 'USA'
        },
        packages: [
          { weight: 45, dimensions: '24x18x12' },
          { weight: 38, dimensions: '20x16x10' }
        ]
      });

      setTrackingMilestones([
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          description: 'Package picked up',
          location: 'San Francisco, CA',
          status: 'completed'
        },
        {
          date: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
          description: 'Departed FedEx facility',
          location: 'San Francisco, CA',
          status: 'completed'
        },
        {
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          description: 'In transit',
          location: 'Sacramento, CA',
          status: 'completed'
        },
        {
          date: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
          description: 'Arrived at FedEx facility',
          location: 'Salt Lake City, UT',
          status: 'completed'
        },
        {
          date: new Date(),
          description: 'In transit to destination',
          location: 'Salt Lake City, UT',
          status: 'current'
        },
        {
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          description: 'Out for delivery',
          location: 'Denver, CO',
          status: 'pending'
        },
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          description: 'Delivered',
          location: 'Denver, CO',
          status: 'pending'
        }
      ]);

      setLoading(false);
    }, 1000);
  }, [shipmentId, orderNumber]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'gray',
      booked: 'blue',
      picked_up: 'blue',
      in_transit: 'blue',
      out_for_delivery: 'orange',
      delivered: 'green',
      exception: 'red',
      cancelled: 'gray'
    };
    return colors[status] || 'gray';
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Shipment Tracking</h2>
            <p className="text-gray-600">Track your order in real-time</p>
          </div>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Download Label
          </button>
        </div>
      </div>

      {/* Shipment Summary */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
            <p className="font-semibold text-blue-600 cursor-pointer hover:underline">
              {shipmentData?.trackingNumber || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Carrier</p>
            <p className="font-semibold">{shipmentData?.carrier || 'N/A'} - {shipmentData?.serviceLevel || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getStatusColor(shipmentData?.status || 'unknown')}-100 text-${getStatusColor(shipmentData?.status || 'unknown')}-800`}>
              {getStatusText(shipmentData?.status || 'unknown')}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Est. Delivery</p>
            <p className="font-semibold">
              {shipmentData?.estimatedDelivery ? new Date(shipmentData.estimatedDelivery).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mb-8">
        <div className="relative">
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
            <div 
              style={{ width: '60%' }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">Picked Up</span>
            <span className="text-xs text-gray-600">In Transit</span>
            <span className="text-xs text-gray-600">Out for Delivery</span>
            <span className="text-xs text-gray-600">Delivered</span>
          </div>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Tracking History</h3>
        <div className="space-y-4">
          {trackingMilestones.map((milestone, index) => (
            <div key={index} className="flex items-start">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                milestone.status === 'completed' 
                  ? 'bg-green-100 text-green-600' 
                  : milestone.status === 'current'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {milestone.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : milestone.status === 'current' ? (
                  <Truck className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex justify-between">
                  <div>
                    <p className={`font-medium ${
                      milestone.status === 'pending' ? 'text-gray-400' : ''
                    }`}>
                      {milestone.description}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      {milestone.location}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {milestone.date.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipment Details */}
      <div className="border-t pt-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          <Info className="w-4 h-4 mr-2" />
          {showDetails ? 'Hide' : 'Show'} Shipment Details
          <ChevronRight className={`w-4 h-4 ml-1 transform transition-transform ${
            showDetails ? 'rotate-90' : ''
          }`} />
        </button>

        {showDetails && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Ship From</h4>
              <p className="text-sm text-gray-600">
                {safeGet(shipmentData, ['shipFrom', 'city']) || 'N/A'}, {safeGet(shipmentData, ['shipFrom', 'state']) || 'N/A'}<br />
                {safeGet(shipmentData, ['shipFrom', 'country']) || 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Ship To</h4>
              <p className="text-sm text-gray-600">
                {safeGet(shipmentData, ['shipTo', 'name']) || 'N/A'}<br />
                {safeGet(shipmentData, ['shipTo', 'address1']) || 'N/A'}<br />
                {safeGet(shipmentData, ['shipTo', 'city']) || 'N/A'}, {safeGet(shipmentData, ['shipTo', 'state']) || 'N/A'} {safeGet(shipmentData, ['shipTo', 'postalCode']) || 'N/A'}<br />
                {safeGet(shipmentData, ['shipTo', 'country']) || 'N/A'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Package Details</h4>
              <div className="space-y-2">
                {(safeGet(shipmentData, ['packages']) as Array<{ weight: number; dimensions: string }> || []).map((pkg: { weight: number; dimensions: string }, index: number) => (
                  <p key={index} className="text-sm text-gray-600">
                    Package {index + 1}: {pkg.weight} lbs, {pkg.dimensions} in
                  </p>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Service Information</h4>
              <p className="text-sm text-gray-600">
                Ship Date: {safeGet(shipmentData, ['shipDate']) ? new Date(safeGet(shipmentData, ['shipDate']) as string).toLocaleDateString() : 'N/A'}<br />
                Service: {safeGet(shipmentData, ['carrier']) || 'N/A'} {safeGet(shipmentData, ['serviceLevel']) || 'N/A'}<br />
                Estimated Transit: 2-3 business days
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMBINED DASHBOARD
// ============================================

interface ProductionShippingDashboardProps {
  defaultTab?: 'production' | 'shipping'
  orderId?: string
}

export default function ProductionShippingDashboard({ defaultTab = 'production', orderId }: ProductionShippingDashboardProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [orderData, setOrderData] = useState<{
    id: string;
    orderNumber: string;
    items: Array<{ id: string; name: string; quantity: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order data');
        
        const data = await response.json();
        setOrderData(data);
      } catch (error) {
        console.error('Error fetching order data:', error);
        setOrderData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <div className="text-slate-600">Loading order data...</div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">No order data available. Please select an order to view production details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Order Status</h1>
        <p className="text-gray-600">Order #{orderData.orderNumber}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('production')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'production'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="inline w-4 h-4 mr-2" />
            Production Tracking
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'shipping'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="inline w-4 h-4 mr-2" />
            Shipping & Delivery
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'production' ? (
        <ProductionTracker 
          orderId={orderData.id} 
          orderItems={orderData.items} 
        />
      ) : (
        <ShippingTracker 
          shipmentId="SHIP-001" 
          orderNumber={orderData.orderNumber} 
        />
      )}
    </div>
  );
}