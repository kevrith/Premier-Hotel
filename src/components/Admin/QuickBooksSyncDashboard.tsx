/**
 * QuickBooks Sync Dashboard Component
 *
 * Displays real-time sync status, statistics, and history for QuickBooks integration.
 * Allows admins to monitor sync operations, retry failed syncs, and trigger manual syncs.
 *
 * Features:
 * - Sync statistics cards (pending, completed, failed)
 * - Sync history table with pagination
 * - Manual sync triggers
 * - Failed sync retry functionality
 * - Real-time status updates
 * - Filtering by status and sync type
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import quickbooksService from '@/lib/api/services/quickbooksService';
import type {
  QBSyncStatus,
  QBSyncLog,
  QBPaginatedSyncLogs,
  SyncStatus,
  SyncType
} from '@/types/quickbooks';

const QuickBooksSyncDashboard: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<QBSyncStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<QBPaginatedSyncLogs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<SyncStatus | ''>('');
  const [filterType, setFilterType] = useState<SyncType | ''>('');

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [currentPage, filterStatus, filterType]);

  const loadDashboardData = async () => {
    try {
      // Load sync status and logs in parallel
      const [statusResponse, logsResponse] = await Promise.all([
        quickbooksService.getSyncStatus(),
        quickbooksService.getSyncLogs({
          page: currentPage,
          page_size: 20,
          status: filterStatus || undefined,
          sync_type: filterType || undefined,
        }),
      ]);

      if (statusResponse.data) {
        setSyncStatus(statusResponse.data);
      }

      if (logsResponse.data) {
        setSyncLogs(logsResponse.data);
      }
    } catch (error: any) {
      toast.error('Failed to load sync dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async (syncType: 'sales' | 'inventory' | 'all') => {
    try {
      setIsManualSyncing(true);
      const response = await quickbooksService.manualSync(syncType);

      if (response.data?.success) {
        toast.success(response.data.message);
        // Reload dashboard data
        await loadDashboardData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to trigger manual sync');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRetrySync = async (logId: string) => {
    try {
      await quickbooksService.retrySync(logId);
      toast.success('Sync retry queued successfully');
      // Reload dashboard data
      await loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to retry sync');
    }
  };

  const getStatusBadge = (status: SyncStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSyncTypeLabel = (type: SyncType) => {
    const labels = {
      sale: 'Sale',
      inventory_pull: 'Inventory Pull',
      inventory_push: 'Inventory Push',
      customer: 'Customer',
    };

    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QuickBooks Sync Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            Monitor and manage QuickBooks synchronization
          </p>
        </div>

        {/* Manual Sync Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleManualSync('inventory')}
            disabled={isManualSyncing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Inventory
          </button>

          <button
            onClick={() => handleManualSync('all')}
            disabled={isManualSyncing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isManualSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Manual Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {syncStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Pending */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{syncStatus.total_pending}</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Processing */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Processing</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{syncStatus.total_processing}</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{syncStatus.total_completed}</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{syncStatus.total_failed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync History Table */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Sync History</h3>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as SyncStatus | '');
                  setCurrentPage(1);
                }}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as SyncType | '');
                  setCurrentPage(1);
                }}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">All Types</option>
                <option value="sale">Sale</option>
                <option value="inventory_pull">Inventory Pull</option>
                <option value="inventory_push">Inventory Push</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QB TxnID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retry Count
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {syncLogs && syncLogs.logs.length > 0 ? (
                syncLogs.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getSyncTypeLabel(log.sync_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono text-xs">
                        {log.reference_type.toUpperCase()}-{log.reference_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.qb_txn_id ? (
                        <span className="font-mono text-xs">{log.qb_txn_id.slice(0, 12)}...</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.retry_count > 0 ? (
                        <span className="text-orange-600 font-medium">{log.retry_count}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {log.status === 'failed' && (
                        <button
                          onClick={() => handleRetrySync(log.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Retry
                        </button>
                      )}
                      {log.error_message && (
                        <button
                          onClick={() => toast.error(log.error_message!)}
                          className="ml-3 text-red-600 hover:text-red-900"
                          title="Show error"
                        >
                          Error
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No sync logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {syncLogs && syncLogs.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {syncLogs.page} of {syncLogs.total_pages} ({syncLogs.total} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(syncLogs.total_pages, p + 1))}
                disabled={currentPage === syncLogs.total_pages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickBooksSyncDashboard;
