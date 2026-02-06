// Core type definitions for Premier Hotel Management System

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole =
  | 'customer'
  | 'admin'
  | 'manager'
  | 'staff'
  | 'chef'
  | 'waiter'
  | 'cleaner';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  permissions?: string[];
  loyalty_points?: number;
  created_at: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

// ============================================================================
// Room & Booking Types
// ============================================================================

export type RoomStatus =
  | 'available'
  | 'occupied'
  | 'cleaning'
  | 'maintenance'
  | 'reserved';

export type RoomType =
  | 'single'
  | 'double'
  | 'suite'
  | 'deluxe'
  | 'presidential';

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  price_per_night: number;
  capacity: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  rating?: number;
  created_at: string;
  updated_at?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  room?: Room;
  check_in: string;
  check_out: string;
  guests: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  special_requests?: string;
  created_at: string;
  updated_at?: string;
}

export interface BookingFormData {
  room_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  special_requests?: string;
}

// ============================================================================
// Menu & Order Types
// ============================================================================

export type MenuCategory =
  | 'appetizer'
  | 'main_course'
  | 'dessert'
  | 'beverage'
  | 'special';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  image_url?: string;
  available: boolean;
  preparation_time?: number;
  ingredients?: string[];
  customization_options?: CustomizationOption[];
  created_at: string;
  updated_at?: string;
}

export interface CustomizationOption {
  name: string;
  options: string[];
  required: boolean;
  additional_cost?: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item?: MenuItem;
  quantity: number;
  price: number;
  customizations?: Record<string, string>;
  special_instructions?: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  status: OrderStatus;
  total_amount: number;
  delivery_location?: string;
  payment_status: PaymentStatus;
  payment_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  customizations?: Record<string, string>;
  special_instructions?: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentMethod = 'mpesa' | 'cash' | 'card';

export interface Payment {
  id: string;
  user_id: string;
  booking_id?: string;
  order_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id?: string;
  phone_number?: string;
  created_at: string;
  updated_at?: string;
}

export interface PaymentIntentData {
  amount: number;
  payment_method: PaymentMethod;
  phone_number?: string;
  booking_id?: string;
  order_id?: string;
}

// ============================================================================
// Staff Management Types
// ============================================================================

export interface Staff {
  id: string;
  user_id: string;
  user?: User;
  role: UserRole;
  hire_date: string;
  department?: string;
  salary?: number;
  status: 'active' | 'inactive' | 'on_leave';
  created_at: string;
  updated_at?: string;
}

export interface StaffShift {
  id: string;
  staff_id: string;
  staff?: Staff;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
  created_at: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  clock_in: string;
  clock_out?: string;
  status: 'present' | 'absent' | 'late';
  created_at: string;
}

export interface StaffPerformance {
  id: string;
  staff_id: string;
  rating: number;
  feedback?: string;
  evaluated_by: string;
  evaluation_date: string;
  created_at: string;
}

// ============================================================================
// Housekeeping Types
// ============================================================================

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface HousekeepingTask {
  id: string;
  room_id: string;
  room?: Room;
  assigned_to?: string;
  assignee?: User;
  task_type: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  scheduled_time?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface RoomInspection {
  id: string;
  room_id: string;
  inspector_id: string;
  inspector?: User;
  inspection_score: number;
  notes?: string;
  issues?: string[];
  inspection_date: string;
  created_at: string;
}

export interface HousekeepingSupply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  last_restock?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// Service Request Types
// ============================================================================

export interface ServiceRequestType {
  id: string;
  name: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  estimated_time?: number;
}

export interface ServiceRequest {
  id: string;
  user_id: string;
  user?: User;
  room_id?: string;
  room?: Room;
  request_type_id: string;
  request_type?: ServiceRequestType;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  assignee?: User;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface ServiceRequestComment {
  id: string;
  request_id: string;
  user_id: string;
  user?: User;
  comment: string;
  created_at: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'order'
  | 'booking'
  | 'payment'
  | 'service'
  | 'system'
  | 'message';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

export interface NotificationPreferences {
  browser: boolean;
  email: boolean;
  sound: boolean;
  order_updates: boolean;
  booking_updates: boolean;
  payment_updates: boolean;
  promotional: boolean;
}

// ============================================================================
// Messaging Types
// ============================================================================

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  content: string;
  read: boolean;
  attachments?: string[];
  created_at: string;
}

// ============================================================================
// Review Types
// ============================================================================

export interface Review {
  id: string;
  user_id: string;
  user?: User;
  room_id?: string;
  order_id?: string;
  rating: number;
  room_rating?: number;
  service_rating?: number;
  cleanliness_rating?: number;
  value_rating?: number;
  amenities_rating?: number;
  location_rating?: number;
  comment?: string;
  images?: string[];
  helpful_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  responder_id: string;
  responder?: User;
  response: string;
  created_at: string;
}

// ============================================================================
// Loyalty Program Types
// ============================================================================

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  transaction_type: 'earned' | 'redeemed';
  description: string;
  order_id?: string;
  booking_id?: string;
  created_at: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface DashboardMetrics {
  total_revenue: number;
  total_bookings: number;
  total_orders: number;
  total_users: number;
  occupancy_rate: number;
  average_rating: number;
  pending_requests: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  orders: number;
}

export interface PopularItem {
  item: MenuItem;
  order_count: number;
  revenue: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

// ============================================================================
// UI Store Types
// ============================================================================

export interface UIState {
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;
  notificationPanelOpen: boolean;
  currentPage: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormErrors {
  [key: string]: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ============================================================================
// Offline Types
// ============================================================================

export interface OfflineQueueItem {
  id: string;
  type: 'order' | 'payment' | 'booking';
  data: any;
  timestamp: string;
  retries: number;
}

export interface OfflineState {
  isOnline: boolean;
  lastSync?: string;
  queuedItems: OfflineQueueItem[];
}
