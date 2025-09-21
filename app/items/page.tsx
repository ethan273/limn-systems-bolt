'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Array<{
    id: string;
    sku?: string;
    name: string;
    description?: string;
    price?: number;
    status?: string;
    category?: string;
    lead_time_days?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8">Loading items...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Items Catalog</h1>
        <button
          onClick={() => router.push('/items/new')}
          className="px-4 py-2 bg-[#1a2b49] text-white rounded hover:bg-[#243150]"
        >
          + Add Item
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                  {item.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {item.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">
                  {item.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">
                  ${item.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.status === 'active' ? 'bg-green-100 text-green-800' :
                    item.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.lead_time_days} days
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => router.push(`/items/${item.id}`)}
                    className="text-[#1a2b49] hover:text-[#243150] mr-3"
                  >
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/items/${item.id}?edit=true`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}