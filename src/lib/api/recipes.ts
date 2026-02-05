import api from './client';

export interface Recipe {
  id: string;
  name: string;
  category: string;
  prep_time: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeCreate {
  name: string;
  category: string;
  prep_time: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  notes?: string;
}

export const recipesApi = {
  getAll: async (): Promise<Recipe[]> => {
    const response = await api.get('/recipes');
    return response.data;
  },

  create: async (data: RecipeCreate): Promise<Recipe> => {
    const response = await api.post('/recipes', data);
    return response.data;
  },

  update: async (id: string, data: RecipeCreate): Promise<Recipe> => {
    const response = await api.put(`/recipes/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`);
  },
};
