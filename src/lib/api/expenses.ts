/**
 * Expense Tracking API Client
 */

import api from './axios';

// Types
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  category_type: 'operational' | 'maintenance' | 'supplies' | 'utilities' | 'payroll' | 'marketing' | 'other';
  icon?: string;
  budget_limit?: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category_id?: string;
  expense_type: 'operational' | 'maintenance' | 'supplies' | 'utilities' | 'payroll' | 'marketing' | 'other';
  title: string;
  description?: string;
  vendor_name?: string;
  invoice_number?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  expense_date: string;
  due_date?: string;
  paid_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  payment_method?: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  receipt_url?: string;
  invoice_url?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  recurring_until?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  budget_number: string;
  name: string;
  description?: string;
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  total_budget: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  category_id: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  alert_threshold_percent: number;
  alert_triggered: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseStatistics {
  total_expenses: number;
  total_amount: number;
  pending_expenses: number;
  pending_amount: number;
  approved_expenses: number;
  approved_amount: number;
  paid_expenses: number;
  paid_amount: number;
  by_category: Record<string, { count: number; amount: number }>;
  by_type: Record<string, { count: number; amount: number }>;
  monthly_trend: any[];
}

export interface BudgetStatistics {
  total_budget: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_percent: number;
  by_category: any[];
  alerts: any[];
}

// Service
class ExpenseService {
  // Expense Categories
  async getCategories(isActive?: boolean): Promise<ExpenseCategory[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) params.append('is_active', isActive.toString());

    const response = await api.get<ExpenseCategory[]>(`/expenses/categories?${params.toString()}`);
    return response.data;
  }

  async createCategory(data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const response = await api.post<ExpenseCategory>('/expenses/categories', data);
    return response.data;
  }

  async updateCategory(categoryId: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const response = await api.patch<ExpenseCategory>(`/expenses/categories/${categoryId}`, data);
    return response.data;
  }

  // Expenses
  async getExpenses(params?: {
    status?: string;
    expense_type?: string;
    category_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Expense[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.expense_type) queryParams.append('expense_type', params.expense_type);
    if (params?.category_id) queryParams.append('category_id', params.category_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get<Expense[]>(`/expenses?${queryParams.toString()}`);
    return response.data;
  }

  async getExpense(expenseId: string): Promise<Expense> {
    const response = await api.get<Expense>(`/expenses/${expenseId}`);
    return response.data;
  }

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    const response = await api.post<Expense>('/expenses', data);
    return response.data;
  }

  async updateExpense(expenseId: string, data: Partial<Expense>): Promise<Expense> {
    const response = await api.patch<Expense>(`/expenses/${expenseId}`, data);
    return response.data;
  }

  async approveExpense(expenseId: string, data: { approved_by: string; approval_notes?: string }): Promise<Expense> {
    const response = await api.patch<Expense>(`/expenses/${expenseId}/approve`, data);
    return response.data;
  }

  async rejectExpense(expenseId: string, data: { approved_by: string; approval_notes: string }): Promise<Expense> {
    const response = await api.patch<Expense>(`/expenses/${expenseId}/reject`, data);
    return response.data;
  }

  async markExpensePaid(expenseId: string, data: {
    paid_date: string;
    payment_method: string;
    transaction_reference?: string;
  }): Promise<Expense> {
    const response = await api.patch<Expense>(`/expenses/${expenseId}/mark-paid`, data);
    return response.data;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    await api.delete(`/expenses/${expenseId}`);
  }

  // Budgets
  async getBudgets(params?: { status?: string; period_type?: string }): Promise<Budget[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.period_type) queryParams.append('period_type', params.period_type);

    const response = await api.get<Budget[]>(`/expenses/budgets?${queryParams.toString()}`);
    return response.data;
  }

  async getBudget(budgetId: string): Promise<Budget> {
    const response = await api.get<Budget>(`/expenses/budgets/${budgetId}`);
    return response.data;
  }

  async createBudget(data: Partial<Budget>): Promise<Budget> {
    const response = await api.post<Budget>('/expenses/budgets', data);
    return response.data;
  }

  async updateBudget(budgetId: string, data: Partial<Budget>): Promise<Budget> {
    const response = await api.patch<Budget>(`/expenses/budgets/${budgetId}`, data);
    return response.data;
  }

  async approveBudget(budgetId: string, approvedBy: string): Promise<Budget> {
    const response = await api.patch<Budget>(`/expenses/budgets/${budgetId}/approve`, { approved_by: approvedBy });
    return response.data;
  }

  // Budget Allocations
  async getBudgetAllocations(budgetId: string): Promise<BudgetAllocation[]> {
    const response = await api.get<BudgetAllocation[]>(`/expenses/budgets/${budgetId}/allocations`);
    return response.data;
  }

  async createBudgetAllocation(budgetId: string, data: Partial<BudgetAllocation>): Promise<BudgetAllocation> {
    const response = await api.post<BudgetAllocation>(`/expenses/budgets/${budgetId}/allocations`, data);
    return response.data;
  }

  async updateBudgetAllocation(
    budgetId: string,
    allocationId: string,
    data: Partial<BudgetAllocation>
  ): Promise<BudgetAllocation> {
    const response = await api.patch<BudgetAllocation>(
      `/expenses/budgets/${budgetId}/allocations/${allocationId}`,
      data
    );
    return response.data;
  }

  // Statistics
  async getExpenseStatistics(params?: { start_date?: string; end_date?: string }): Promise<ExpenseStatistics> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await api.get<ExpenseStatistics>(`/expenses/statistics/expenses?${queryParams.toString()}`);
    return response.data;
  }

  async getBudgetStatistics(budgetId: string): Promise<BudgetStatistics> {
    const response = await api.get<BudgetStatistics>(`/expenses/statistics/budgets/${budgetId}`);
    return response.data;
  }
}

export const expenseService = new ExpenseService();
