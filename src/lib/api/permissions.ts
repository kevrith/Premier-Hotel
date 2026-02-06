import api from './client';

export interface Permission {
  key: string;
  label: string;
  description: string;
  category: string;
}

export interface UserPermissions {
  id: string;
  email?: string;
  full_name: string;
  role: string;
  permissions: string[];
  updated_at: string;
}

export const permissionsApi = {
  getAvailable: async (): Promise<Permission[]> => {
    const response = await api.get('/permissions/available');
    return response.data;
  },

  getUserPermissions: async (userId: string): Promise<UserPermissions> => {
    const response = await api.get(`/permissions/user/${userId}`);
    return response.data;
  },

  updateUserPermissions: async (userId: string, permissions: string[]): Promise<UserPermissions> => {
    const response = await api.put(`/permissions/user/${userId}`, { user_id: userId, permissions });
    return response.data;
  },

  getAllStaffPermissions: async (): Promise<UserPermissions[]> => {
    const response = await api.get('/permissions/staff');
    return response.data;
  },
};
