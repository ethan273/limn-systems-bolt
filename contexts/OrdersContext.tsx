import { createContext, useContext, useReducer, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface OrdersState {
  selectedOrderId: string | null;
  filters: {
    status: string;
    customerId: string;
    dateRange: { from: Date; to: Date };
    search: string;
  };
  view: 'table' | 'kanban' | 'calendar';
  isCreateDialogOpen: boolean;
}

type OrdersAction =
  | { type: 'SELECT_ORDER'; orderId: string | null }
  | { type: 'SET_FILTERS'; filters: Partial<OrdersState['filters']> }
  | { type: 'SET_VIEW'; view: OrdersState['view'] }
  | { type: 'TOGGLE_CREATE_DIALOG' };

const initialState: OrdersState = {
  selectedOrderId: null,
  filters: {
    status: 'all',
    customerId: '',
    dateRange: { from: new Date(), to: new Date() },
    search: ''
  },
  view: 'table',
  isCreateDialogOpen: false
};

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'SELECT_ORDER':
      return { ...state, selectedOrderId: action.orderId };
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.filters } 
      };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'TOGGLE_CREATE_DIALOG':
      return { ...state, isCreateDialogOpen: !state.isCreateDialogOpen };
    default:
      return state;
  }
}

const OrdersContext = createContext<{
  state: OrdersState;
  dispatch: React.Dispatch<OrdersAction>;
  orders: unknown[];
  isLoading: boolean;
  error: Error | null;
  createOrder: (data: unknown) => Promise<void>;
  updateOrder: (id: string, data: unknown) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
} | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ordersReducer, initialState);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch orders with filters
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', state.filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items(*)
        `);

      if (state.filters.status !== 'all') {
        query = query.eq('status', state.filters.status);
      }
      if (state.filters.customerId) {
        query = query.eq('customer_id', state.filters.customerId);
      }
      if (state.filters.search) {
        query = query.ilike('order_number', `%${state.filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      dispatch({ type: 'TOGGLE_CREATE_DIALOG' });
    }
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...(data && typeof data === 'object' ? data : {}) })
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/orders?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      dispatch({ type: 'SELECT_ORDER', orderId: null });
    }
  });

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      orders,
      isLoading,
      error,
      createOrder: createOrderMutation.mutateAsync,
      updateOrder: (id: string, data: unknown) => 
        updateOrderMutation.mutateAsync({ id, data }),
      deleteOrder: deleteOrderMutation.mutateAsync
    }),
    [state, orders, isLoading, error, createOrderMutation.mutateAsync, updateOrderMutation, deleteOrderMutation.mutateAsync]
  );

  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within OrdersProvider');
  }
  return context;
}