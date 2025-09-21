'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Package, 
  User, 
  Calendar, 
  DollarSign, 
  Truck, 
  Phone, 
  Mail,
  Edit,
  Download,
  Eye,
  Clock,
  AlertCircle
} from 'lucide-react';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  order_type: 'standard' | 'custom' | 'rush';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  estimated_completion: string;
  actual_completion?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
  };
  items?: Array<{
    id: string;
    item_id: string;
    quantity: number;
    unit_price: number;
    customization?: unknown;
    item: {
      name: string;
      sku: string;
      category: string;
    };
  }>;
  production_tracking?: {
    current_stage: string;
    progress: number;
    estimated_completion: string;
  };
  shipping_info?: {
    carrier: string;
    tracking_number: string;
    estimated_delivery: string;
  };
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      loadOrderDetails(params.id as string);
    }
  }, [params?.id]);

  async function loadOrderDetails(orderId: string) {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      
      const data = await response.json();
      setOrder(data.order);
    } catch {
      console.error('Error loading order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_production': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Order Not Found</h2>
        <p className="text-gray-600 mb-4">The order you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <button
          onClick={() => router.push('/orders')}
          className="px-4 py-2 bg-[#1a2b49] text-white rounded hover:bg-[#243150]"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-gray-600 mt-1">Order placed on {formatDate(order.created_at)}</p>
        </div>
        
        <div className="flex space-x-3">
          <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
          <button className="px-4 py-2 bg-[#1a2b49] text-white rounded hover:bg-[#243150] flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Edit Order
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <div className="flex items-center mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {safeFormatString(order.status, 'Unknown')}
                </span>
              </div>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Priority</p>
              <div className="flex items-center mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(order.priority)}`}>
                  {order.priority}
                </span>
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${order.total_amount.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Est. Completion</p>
              <p className="text-sm text-gray-900 mt-1">
                {formatDate(order.estimated_completion)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Information
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {order.customer?.company_name && (
              <div>
                <p className="text-sm font-medium text-gray-600">Company</p>
                <p className="text-gray-900">{order.customer.company_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-600">Name</p>
              <p className="text-gray-900">{order.customer?.name}</p>
            </div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-gray-400" />
              <a href={`mailto:${order.customer?.email}`} className="text-[#1a2b49] hover:underline">
                {order.customer?.email}
              </a>
            </div>
            {order.customer?.phone && (
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <a href={`tel:${order.customer.phone}`} className="text-[#1a2b49] hover:underline">
                  {order.customer.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Production Tracking */}
        {order.production_tracking && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Production Status
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Stage</p>
                <p className="text-gray-900 font-medium">{order.production_tracking.current_stage}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Progress</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#1a2b49] h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${order.production_tracking.progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">{order.production_tracking.progress}% complete</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Estimated Completion</p>
                <p className="text-gray-900">{formatDate(order.production_tracking.estimated_completion)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Information */}
        {order.shipping_info && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Shipping Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Carrier</p>
                <p className="text-gray-900">{order.shipping_info.carrier}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tracking Number</p>
                <p className="text-gray-900 font-mono">{order.shipping_info.tracking_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Estimated Delivery</p>
                <p className="text-gray-900">{formatDate(order.shipping_info.estimated_delivery)}</p>
              </div>
              <button className="w-full px-4 py-2 bg-[#1a2b49] text-white rounded hover:bg-[#243150] flex items-center justify-center">
                <Eye className="w-4 h-4 mr-2" />
                Track Package
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      {order.items && (order.items || []).length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(order.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {item.item.sku}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize text-gray-600">
                      {item.item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-bold">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/items/${item.item_id}`)}
                        className="text-[#1a2b49] hover:text-[#243150]"
                      >
                        View Item
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right font-medium text-gray-900">
                    Total Amount:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xl font-bold text-gray-900">
                    ${order.total_amount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}