import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  AlertCircle,
  Target,
  PieChart
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { expenseService } from '@/lib/api/expenses';

export default function ExpenseTracking() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');

  // Expenses
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [expenseStats, setExpenseStats] = useState(null);

  // Budgets
  const [budgets, setBudgets] = useState([]);
  const [filteredBudgets, setFilteredBudgets] = useState([]);

  // Categories
  const [categories, setCategories] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);

  useEffect(() => {
    // Check authentication and role
    if (!isAuthenticated) {
      toast.error('Please login to access expense tracking');
      navigate('/login');
      return;
    }

    const userRole = user?.role || 'customer';
    if (!['admin', 'manager', 'staff'].includes(userRole)) {
      toast.error('You do not have permission to access expense tracking');
      navigate('/');
      return;
    }

    loadData();
  }, [isAuthenticated, user, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, expensesData, budgetsData, statsData] = await Promise.all([
        expenseService.getCategories(true),
        expenseService.getExpenses(),
        expenseService.getBudgets({ status: 'active' }),
        expenseService.getExpenseStatistics()
      ]);

      setCategories(categoriesData);
      setExpenses(expensesData);
      setFilteredExpenses(expensesData);
      setBudgets(budgetsData);
      setFilteredBudgets(budgetsData);
      setExpenseStats(statsData);
    } catch (error) {
      console.error('Error loading expense data:', error);
      toast.error('Failed to load expense data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter expenses
  useEffect(() => {
    let filtered = expenses;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.expense_number.toLowerCase().includes(query) ||
        e.title.toLowerCase().includes(query) ||
        e.vendor_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category_id === categoryFilter);
    }

    if (dateRange.start) {
      filtered = filtered.filter(e => e.expense_date >= dateRange.start);
    }

    if (dateRange.end) {
      filtered = filtered.filter(e => e.expense_date <= dateRange.end);
    }

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, statusFilter, categoryFilter, dateRange]);

  // Filter budgets
  useEffect(() => {
    let filtered = budgets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.budget_number.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query)
      );
    }

    setFilteredBudgets(filtered);
  }, [budgets, searchQuery]);

  const handleApproveExpense = async (expenseId) => {
    try {
      await expenseService.approveExpense(expenseId, {
        approved_by: user.id,
        approval_notes: 'Approved via dashboard'
      });
      toast.success('Expense approved successfully');
      loadData();
    } catch (error) {
      console.error('Error approving expense:', error);
      toast.error('Failed to approve expense');
    }
  };

  const handleRejectExpense = async (expenseId) => {
    try {
      await expenseService.rejectExpense(expenseId, {
        approved_by: user.id,
        approval_notes: 'Rejected via dashboard'
      });
      toast.success('Expense rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      toast.error('Failed to reject expense');
    }
  };

  const handleMarkPaid = async (expenseId) => {
    try {
      await expenseService.markExpensePaid(expenseId, {
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer'
      });
      toast.success('Expense marked as paid');
      loadData();
    } catch (error) {
      console.error('Error marking expense as paid:', error);
      toast.error('Failed to mark expense as paid');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Tracking & Budgeting</h1>
          <p className="text-gray-600">Manage expenses, budgets, and financial reporting</p>
        </div>

        {/* Statistics Cards */}
        {expenseStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(expenseStats.total_amount)}</div>
                <p className="text-xs text-gray-500 mt-1">{expenseStats.total_expenses} expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(expenseStats.pending_amount)}</div>
                <p className="text-xs text-gray-500 mt-1">{expenseStats.pending_expenses} pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(expenseStats.approved_amount)}</div>
                <p className="text-xs text-gray-500 mt-1">{expenseStats.approved_expenses} approved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(expenseStats.paid_amount)}</div>
                <p className="text-xs text-gray-500 mt-1">{expenseStats.paid_expenses} paid</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Financial Management</CardTitle>
                <CardDescription>Track expenses and manage budgets</CardDescription>
              </div>
              <div className="flex gap-2">
                {activeTab === 'expenses' && (
                  <Button onClick={() => setShowExpenseModal(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Expense
                  </Button>
                )}
                {activeTab === 'budgets' && user?.role === 'admin' && (
                  <Button onClick={() => setShowBudgetModal(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    New Budget
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="budgets">Budgets</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {activeTab === 'expenses' && (
                  <>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border rounded-md"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-4 py-2 border rounded-md"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Expenses Tab */}
              <TabsContent value="expenses" className="space-y-4">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first expense</p>
                    <Button onClick={() => setShowExpenseModal(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Expense
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Expense #</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Vendor</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Payment</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{expense.expense_number}</td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">{expense.title}</div>
                                {expense.description && (
                                  <div className="text-sm text-gray-500">{expense.description.substring(0, 50)}...</div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {categories.find(c => c.id === expense.category_id)?.name || expense.expense_type}
                            </td>
                            <td className="py-3 px-4">{expense.vendor_name || '-'}</td>
                            <td className="py-3 px-4 font-medium">{formatCurrency(expense.total_amount)}</td>
                            <td className="py-3 px-4">{formatDate(expense.expense_date)}</td>
                            <td className="py-3 px-4">{getStatusBadge(expense.status)}</td>
                            <td className="py-3 px-4">{getPaymentStatusBadge(expense.payment_status)}</td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end gap-2">
                                {expense.status === 'pending' && ['admin', 'manager'].includes(user?.role) && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleApproveExpense(expense.id)}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRejectExpense(expense.id)}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {expense.status === 'approved' && expense.payment_status === 'unpaid' && ['admin', 'manager'].includes(user?.role) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkPaid(expense.id)}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedExpense(expense)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Budgets Tab */}
              <TabsContent value="budgets" className="space-y-4">
                {filteredBudgets.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets found</h3>
                    <p className="text-gray-500 mb-4">Create a budget to start tracking spending</p>
                    {user?.role === 'admin' && (
                      <Button onClick={() => setShowBudgetModal(true)}>
                        <Target className="h-4 w-4 mr-2" />
                        New Budget
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredBudgets.map((budget) => {
                      const utilizationPercent = (budget.spent_amount / budget.total_budget) * 100;
                      const isOverBudget = utilizationPercent > 100;
                      const isNearLimit = utilizationPercent > 80 && utilizationPercent <= 100;

                      return (
                        <Card key={budget.id} className={isOverBudget ? 'border-red-300' : isNearLimit ? 'border-yellow-300' : ''}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{budget.name}</CardTitle>
                                <CardDescription>{budget.budget_number}</CardDescription>
                              </div>
                              <Badge className={budget.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                                {budget.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-gray-600">Budget Utilization</span>
                                  <span className={isOverBudget ? 'text-red-600 font-medium' : 'text-gray-900'}>
                                    {utilizationPercent.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-600 mb-1">Total Budget</div>
                                  <div className="font-medium">{formatCurrency(budget.total_budget)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Spent</div>
                                  <div className="font-medium text-red-600">{formatCurrency(budget.spent_amount)}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Remaining</div>
                                  <div className={`font-medium ${budget.remaining_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(budget.remaining_amount)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                                <span>{budget.period_type} budget</span>
                                <span>{formatDate(budget.start_date)} - {formatDate(budget.end_date)}</span>
                              </div>

                              {isOverBudget && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>Budget exceeded!</span>
                                </div>
                              )}
                              {isNearLimit && !isOverBudget && (
                                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>Approaching budget limit</span>
                                </div>
                              )}

                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSelectedBudget(budget)}
                              >
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => {
                    const categoryStats = expenseStats?.by_category?.[category.id] || { count: 0, amount: 0 };
                    return (
                      <Card key={category.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          <CardDescription>{category.category_type}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Expenses</span>
                              <span className="font-medium">{categoryStats.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Total Amount</span>
                              <span className="font-medium">{formatCurrency(categoryStats.amount)}</span>
                            </div>
                            {category.budget_limit && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Budget Limit</span>
                                <span className="font-medium">{formatCurrency(category.budget_limit)}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Reports</CardTitle>
                    <CardDescription>Financial insights and analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* By Category */}
                      <div>
                        <h3 className="font-medium mb-4">Expenses by Category</h3>
                        <div className="space-y-2">
                          {Object.entries(expenseStats?.by_category || {}).map(([categoryId, data]) => {
                            const category = categories.find(c => c.id === categoryId);
                            const percentage = (data.amount / expenseStats.total_amount) * 100;
                            return (
                              <div key={categoryId}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{category?.name || 'Unknown'}</span>
                                  <span className="font-medium">{formatCurrency(data.amount)} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* By Type */}
                      <div>
                        <h3 className="font-medium mb-4">Expenses by Type</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(expenseStats?.by_type || {}).map(([type, data]) => (
                            <Card key={type}>
                              <CardContent className="pt-6">
                                <div className="text-center">
                                  <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                                  <div className="text-sm text-gray-600 mt-1">{type}</div>
                                  <div className="text-xs text-gray-500 mt-1">{data.count} expenses</div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
