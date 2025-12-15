/**
 * Reviews & Ratings API Client
 * TypeScript client for customer reviews
 */

import api from './axios';

// Types
export interface Review {
  id: string;
  review_number: string;
  user_id: string;
  booking_id?: string;
  room_id?: string;
  review_type: 'room' | 'service' | 'food' | 'overall' | 'staff' | 'amenities';
  overall_rating: number;
  cleanliness_rating?: number;
  comfort_rating?: number;
  location_rating?: number;
  facilities_rating?: number;
  staff_rating?: number;
  value_rating?: number;
  title?: string;
  comment: string;
  pros?: string;
  cons?: string;
  guest_name?: string;
  guest_type?: 'solo' | 'couple' | 'family' | 'business' | 'group';
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
  is_verified: boolean;
  verified_stay: boolean;
  helpful_count: number;
  not_helpful_count: number;
  response_count: number;
  has_response: boolean;
  stay_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  user_id: string;
  booking_id?: string;
  room_id?: string;
  review_type: string;
  overall_rating: number;
  comment: string;
  title?: string;
  cleanliness_rating?: number;
  comfort_rating?: number;
  guest_type?: string;
  stay_date?: string;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  responder_id: string;
  responder_name?: string;
  responder_position?: string;
  response: string;
  is_official: boolean;
  created_at: string;
}

export interface ReviewStats {
  total_reviews: number;
  approved_reviews: number;
  pending_reviews: number;
  average_rating: number;
  rating_distribution: Record<string, number>;
}

// Service
class ReviewsService {
  async getReviews(params?: {
    status?: string;
    review_type?: string;
    room_id?: string;
    min_rating?: number;
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.review_type) queryParams.append('review_type', params.review_type);
    if (params?.room_id) queryParams.append('room_id', params.room_id);
    if (params?.min_rating) queryParams.append('min_rating', params.min_rating.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<Review[]>(`/reviews?${queryParams.toString()}`);
    return response.data;
  }

  async getReview(reviewId: string): Promise<Review> {
    const response = await api.get<Review>(`/reviews/${reviewId}`);
    return response.data;
  }

  async createReview(data: ReviewCreate): Promise<Review> {
    const response = await api.post<Review>('/reviews', data);
    return response.data;
  }

  async updateReview(reviewId: string, data: Partial<ReviewCreate>): Promise<Review> {
    const response = await api.patch<Review>(`/reviews/${reviewId}`, data);
    return response.data;
  }

  async deleteReview(reviewId: string): Promise<void> {
    await api.delete(`/reviews/${reviewId}`);
  }

  async markHelpful(reviewId: string, isHelpful: boolean): Promise<void> {
    await api.post(`/reviews/${reviewId}/helpful`, { is_helpful: isHelpful });
  }

  async getResponses(reviewId: string): Promise<ReviewResponse[]> {
    const response = await api.get<ReviewResponse[]>(`/reviews/${reviewId}/responses`);
    return response.data;
  }

  async addResponse(reviewId: string, data: { response: string }): Promise<ReviewResponse> {
    const response = await api.post<ReviewResponse>(`/reviews/${reviewId}/responses`, data);
    return response.data;
  }

  async getStats(roomId?: string): Promise<ReviewStats> {
    const params = roomId ? `?room_id=${roomId}` : '';
    const response = await api.get<ReviewStats>(`/reviews/stats/overview${params}`);
    return response.data;
  }
}

export const reviewsService = new ReviewsService();

// Helper functions
export function getStarColor(rating: number): string {
  if (rating >= 4) return 'text-green-500';
  if (rating >= 3) return 'text-yellow-500';
  return 'text-red-500';
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
