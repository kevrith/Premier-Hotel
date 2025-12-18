/**
 * QuickBooks Configuration Component
 *
 * Allows administrators to configure QuickBooks POS 2013 integration settings
 * including connection details, credentials, and sync preferences.
 *
 * Features:
 * - Connection configuration (company file, Web Connector URL)
 * - Credentials management (username, password)
 * - Sync toggles (sales, inventory)
 * - Connection testing
 * - Real-time status indicators
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import quickbooksService from '@/lib/api/services/quickbooksService';
import type { QBConfig, QBConfigUpdate } from '@/types/quickbooks';

const QuickBooksConfig: React.FC = () => {
  const [config, setConfig] = useState<QBConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [formData, setFormData] = useState<QBConfigUpdate>({
    company_file_path: '',
    web_connector_url: '',
    username: '',
    password: '',
    sync_enabled: false,
    sync_sales: true,
    sync_inventory: true,
    inventory_sync_interval_minutes: 60,
  });

  // Load existing configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await quickbooksService.getConfig();
      if (response.data) {
        setConfig(response.data);
        setFormData({
          company_file_path: response.data.company_file_path,
          web_connector_url: response.data.web_connector_url,
          username: response.data.username,
          password: '', // Don't populate password for security
          sync_enabled: response.data.sync_enabled,
          sync_sales: response.data.sync_sales,
          sync_inventory: response.data.sync_inventory,
          inventory_sync_interval_minutes: response.data.inventory_sync_interval_minutes,
        });
      }
    } catch (error: any) {
      // Config might not exist yet - this is OK
      if (error.response?.status !== 404) {
        toast.error('Failed to load QuickBooks configuration');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof QBConfigUpdate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.company_file_path || !formData.web_connector_url || !formData.username) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!config && !formData.password) {
      toast.error('Password is required for initial setup');
      return;
    }

    try {
      setIsSaving(true);
      const updateData: QBConfigUpdate = { ...formData };

      // Only include password if it's been changed
      if (!formData.password) {
        delete updateData.password;
      }

      const response = await quickbooksService.updateConfig(updateData);

      if (response.data) {
        setConfig(response.data);
        toast.success('QuickBooks configuration saved successfully');

        // Clear password field after save
        setFormData((prev) => ({ ...prev, password: '' }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      const response = await quickbooksService.testConnection();

      if (response.data?.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data?.message || 'Connection test failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  const getConnectionStatusBadge = () => {
    if (!config) return null;

    const statusColors = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      syncing: 'bg-blue-100 text-blue-800',
    };

    const statusIcons = {
      connected: '✓',
      disconnected: '○',
      error: '✗',
      syncing: '↻',
    };

    const color = statusColors[config.connection_status] || statusColors.disconnected;
    const icon = statusIcons[config.connection_status] || statusIcons.disconnected;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        <span className="mr-1">{icon}</span>
        {config.connection_status.charAt(0).toUpperCase() + config.connection_status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">QuickBooks POS Integration</h2>
            <p className="mt-1 text-sm text-gray-600">
              Configure QuickBooks POS 2013 integration settings and credentials
            </p>
          </div>
          {config && (
            <div className="flex items-center gap-3">
              {getConnectionStatusBadge()}
            </div>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveConfig} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Connection Settings Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Settings</h3>

          <div className="space-y-4">
            {/* Company File Path */}
            <div>
              <label htmlFor="company_file_path" className="block text-sm font-medium text-gray-700">
                Company File Path <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="company_file_path"
                value={formData.company_file_path}
                onChange={(e) => handleInputChange('company_file_path', e.target.value)}
                placeholder="C:\ProgramData\Intuit\QuickBooks POS v13\Company Files\company.qbposdb"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Full path to your QuickBooks POS company file
              </p>
            </div>

            {/* Web Connector URL */}
            <div>
              <label htmlFor="web_connector_url" className="block text-sm font-medium text-gray-700">
                Web Connector URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="web_connector_url"
                value={formData.web_connector_url}
                onChange={(e) => handleInputChange('web_connector_url', e.target.value)}
                placeholder="http://localhost:3000/api/v1/quickbooks-connector/soap"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                SOAP endpoint URL for QuickBooks Web Connector
              </p>
            </div>
          </div>
        </div>

        {/* Credentials Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Credentials</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="qb_connector"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password {!config && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={config ? 'Leave blank to keep current password' : 'Enter password'}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required={!config}
              />
              {config && (
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to keep current password
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sync Settings Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Settings</h3>

          <div className="space-y-4">
            {/* Enable Sync */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="sync_enabled"
                  checked={formData.sync_enabled}
                  onChange={(e) => handleInputChange('sync_enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="sync_enabled" className="font-medium text-gray-700">
                  Enable QuickBooks Sync
                </label>
                <p className="text-sm text-gray-500">
                  Start syncing transactions with QuickBooks POS
                </p>
              </div>
            </div>

            {/* Sync Sales */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="sync_sales"
                  checked={formData.sync_sales}
                  onChange={(e) => handleInputChange('sync_sales', e.target.checked)}
                  disabled={!formData.sync_enabled}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="sync_sales" className="font-medium text-gray-700">
                  Sync Sales Transactions
                </label>
                <p className="text-sm text-gray-500">
                  Automatically sync completed orders and bookings to QuickBooks
                </p>
              </div>
            </div>

            {/* Sync Inventory */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="sync_inventory"
                  checked={formData.sync_inventory}
                  onChange={(e) => handleInputChange('sync_inventory', e.target.checked)}
                  disabled={!formData.sync_enabled}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="sync_inventory" className="font-medium text-gray-700">
                  Sync Inventory Levels
                </label>
                <p className="text-sm text-gray-500">
                  Bi-directional inventory synchronization with QuickBooks
                </p>
              </div>
            </div>

            {/* Inventory Sync Interval */}
            {formData.sync_inventory && (
              <div>
                <label htmlFor="inventory_sync_interval" className="block text-sm font-medium text-gray-700">
                  Inventory Sync Interval (minutes)
                </label>
                <input
                  type="number"
                  id="inventory_sync_interval"
                  value={formData.inventory_sync_interval_minutes}
                  onChange={(e) => handleInputChange('inventory_sync_interval_minutes', parseInt(e.target.value))}
                  min="15"
                  max="1440"
                  disabled={!formData.sync_enabled}
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  How often to sync inventory levels (15-1440 minutes)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !config}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Testing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Connection
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Install QuickBooks POS 2013 and create a company file</li>
          <li>Install QuickBooks Web Connector on the same machine</li>
          <li>Fill in the configuration above with your company file path</li>
          <li>Save the configuration and test the connection</li>
          <li>Download the QBWC file and add it to Web Connector</li>
          <li>Start the Web Connector to begin syncing</li>
        </ol>
      </div>
    </div>
  );
};

export default QuickBooksConfig;
