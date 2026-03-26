import apiClient from './client';

export interface RestaurantTable {
  id: string;
  name: string;
  section?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  assigned_waiter_id?: string;
  assigned_waiter?: { id: string; full_name: string };
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TableCreate {
  name: string;
  section?: string;
  capacity?: number;
  notes?: string;
}

export interface TableUpdate extends Partial<TableCreate> {
  status?: RestaurantTable['status'];
}

export const tablesAPI = {
  getAll: async (params?: { section?: string; waiter_id?: string }): Promise<RestaurantTable[]> => {
    const q = new URLSearchParams();
    if (params?.section) q.append('section', params.section);
    if (params?.waiter_id) q.append('waiter_id', params.waiter_id);
    const res = await apiClient.get(`/tables?${q.toString()}`);
    return res.data;
  },
  create: async (data: TableCreate): Promise<RestaurantTable> => {
    const res = await apiClient.post('/tables', data);
    return res.data;
  },
  update: async (id: string, data: TableUpdate): Promise<RestaurantTable> => {
    const res = await apiClient.put(`/tables/${id}`, data);
    return res.data;
  },
  assignWaiter: async (id: string, waiter_id: string | null): Promise<RestaurantTable> => {
    const res = await apiClient.patch(`/tables/${id}/assign`, { waiter_id });
    return res.data;
  },
  updateStatus: async (id: string, status: RestaurantTable['status']): Promise<RestaurantTable> => {
    const res = await apiClient.patch(`/tables/${id}/status`, { status });
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tables/${id}`);
  },
};
