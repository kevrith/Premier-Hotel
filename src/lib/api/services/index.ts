/**
 * API Services Index
 * Central export point for all API service modules
 */

export { default as authService } from './authService';
export { default as roomService } from './roomService';
export { default as bookingService } from './bookingService';
export { default as menuService } from './menuService';
export { default as userService } from './userService';

// Re-export the API client for direct use if needed
export { api } from '../client';
