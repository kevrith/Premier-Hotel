/**
 * Rooms API Client
 * Handles all room-related operations
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Configure axios instance with cookie-based auth
const api = axios.create({
  baseURL: `${API_URL}/rooms`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// ============================================
// Types
// ============================================

export interface Room {
  id: string;
  room_number: string;
  type: string;
  type_sw?: string;
  description?: string;
  description_sw?: string;
  base_price: number;
  max_occupancy: number;
  floor?: number;
  view_type?: string;
  size_sqm?: number;
  amenities: string[];
  images: string[];
  status: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface RoomCreate {
  room_number: string;
  type: string;
  type_sw?: string;
  description?: string;
  description_sw?: string;
  base_price: number;
  max_occupancy?: number;
  floor?: number;
  view_type?: string;
  size_sqm?: number;
  amenities?: string[];
  images?: string[];
}

export interface RoomUpdate {
  room_number?: string;
  type?: string;
  type_sw?: string;
  description?: string;
  description_sw?: string;
  base_price?: number;
  max_occupancy?: number;
  floor?: number;
  view_type?: string;
  size_sqm?: number;
  status?: 'available' | 'occupied' | 'maintenance' | 'reserved';
  amenities?: string[];
  images?: string[];
}

// ============================================
// Rooms API Service
// ============================================

class RoomsAPIService {
  /**
   * Get all rooms
   */
  async listRooms(type?: string, available?: boolean): Promise<Room[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (available !== undefined) params.append('available', available.toString());

      const response = await api.get<Room[]>(`/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch rooms');
    }
  }

  /**
   * Get a specific room by ID
   */
  async getRoom(roomId: string): Promise<Room> {
    try {
      const response = await api.get<Room>(`/${roomId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch room');
    }
  }

  /**
   * Create a new room
   */
  async createRoom(roomData: RoomCreate): Promise<Room> {
    try {
      const response = await api.post<Room>('/', roomData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to create room');
    }
  }

  /**
   * Update an existing room
   */
  async updateRoom(roomId: string, roomData: RoomUpdate): Promise<Room> {
    try {
      const response = await api.put<Room>(`/${roomId}`, roomData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update room');
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/${roomId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete room');
    }
  }

  /**
   * Get room types
   */
  async getRoomTypes(): Promise<string[]> {
    try {
      const response = await api.get<string[]>('/types');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch room types');
    }
  }

  /**
   * Check room availability
   */
  async checkAvailability(roomId: string, checkIn: string, checkOut: string): Promise<{ available: boolean }> {
    try {
      const params = new URLSearchParams();
      params.append('check_in', checkIn);
      params.append('check_out', checkOut);

      const response = await api.get<{ available: boolean }>(`/${roomId}/availability?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to check availability');
    }
  }
}

export const roomsAPI = new RoomsAPIService();
export default roomsAPI;
