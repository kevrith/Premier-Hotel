/**
 * QuickBooks Item Mapping Component
 *
 * Allows administrators to map hotel menu items and inventory items to
 * QuickBooks POS items for proper sync integration.
 *
 * Features:
 * - View all item mappings with hotel item names
 * - Create new mappings (hotel item → QB item)
 * - Delete existing mappings
 * - Toggle inventory sync per item
 * - Search and filter mappings
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import quickbooksService from '@/lib/api/services/quickbooksService';
import type { QBItemMapping, QBItemMappingCreate, ItemType } from '@/types/quickbooks';

const QuickBooksItemMapping: React.FC = () => {
  const [mappings, setMappings] = useState<QBItemMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add mapping form state
  const [newMapping, setNewMapping] = useState<QBItemMappingCreate>({
    hotel_item_id: '',
    hotel_item_type: 'menu_item',
    qb_item_list_id: '',
    qb_item_full_name: '',
    sync_inventory: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setIsLoading(true);
      const response = await quickbooksService.getItemMappings();
      if (response.data) {
        setMappings(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load item mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newMapping.hotel_item_id || !newMapping.qb_item_list_id || !newMapping.qb_item_full_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const response = await quickbooksService.createItemMapping(newMapping);

      if (response.data) {
        toast.success('Item mapping created successfully');
        setMappings([response.data, ...mappings]);
        setShowAddModal(false);

        // Reset form
        setNewMapping({
          hotel_item_id: '',
          hotel_item_type: 'menu_item',
          qb_item_list_id: '',
          qb_item_full_name: '',
          sync_inventory: true,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create mapping');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) {
      return;
    }

    try {
      await quickbooksService.deleteItemMapping(mappingId);
      toast.success('Item mapping deleted successfully');
      setMappings(mappings.filter((m) => m.id !== mappingId));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete mapping');
    }
  };

  const filteredMappings = mappings.filter((mapping) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      mapping.hotel_item_name?.toLowerCase().includes(searchLower) ||
      mapping.qb_item_full_name.toLowerCase().includes(searchLower) ||
      mapping.qb_item_list_id.toLowerCase().includes(searchLower)
    );
  });

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
          <h2 className="text-2xl font-bold text-gray-900">QuickBooks Item Mapping</h2>
          <p className="mt-1 text-sm text-gray-600">
            Map hotel menu and inventory items to QuickBooks POS items
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Mapping
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search mappings by item name, QB item name, or ListID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full border-0 focus:ring-0 text-sm"
          />
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hotel Item
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QuickBooks Item
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QB ListID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sync Inventory
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMappings.length > 0 ? (
              filteredMappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {mapping.hotel_item_name || 'Unknown Item'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {mapping.hotel_item_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      mapping.hotel_item_type === 'menu_item'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {mapping.hotel_item_type === 'menu_item' ? 'Menu Item' : 'Inventory Item'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{mapping.qb_item_full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-gray-500 font-mono">
                      {mapping.qb_item_list_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {mapping.sync_inventory ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  {searchTerm ? 'No mappings found matching your search' : 'No item mappings configured yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900">Mapping Summary</h4>
            <div className="mt-2 text-sm text-blue-800 space-y-1">
              <div>Total Mappings: <span className="font-semibold">{mappings.length}</span></div>
              <div>
                Menu Items: <span className="font-semibold">
                  {mappings.filter(m => m.hotel_item_type === 'menu_item').length}
                </span>
              </div>
              <div>
                Inventory Items: <span className="font-semibold">
                  {mappings.filter(m => m.hotel_item_type === 'inventory_item').length}
                </span>
              </div>
              <div>
                Inventory Sync Enabled: <span className="font-semibold">
                  {mappings.filter(m => m.sync_inventory).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Item Mapping</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMapping} className="space-y-4">
              {/* Hotel Item Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newMapping.hotel_item_type}
                  onChange={(e) => setNewMapping({ ...newMapping, hotel_item_type: e.target.value as ItemType })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="menu_item">Menu Item</option>
                  <option value="inventory_item">Inventory Item</option>
                </select>
              </div>

              {/* Hotel Item ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hotel Item ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMapping.hotel_item_id}
                  onChange={(e) => setNewMapping({ ...newMapping, hotel_item_id: e.target.value })}
                  placeholder="UUID of menu or inventory item"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Find the item ID from your menu or inventory management
                </p>
              </div>

              {/* QB Item ListID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QuickBooks ListID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMapping.qb_item_list_id}
                  onChange={(e) => setNewMapping({ ...newMapping, qb_item_list_id: e.target.value })}
                  placeholder="e.g., 800000-1234567890"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  QuickBooks item ListID (found in QB POS)
                </p>
              </div>

              {/* QB Item Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QuickBooks Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMapping.qb_item_full_name}
                  onChange={(e) => setNewMapping({ ...newMapping, qb_item_full_name: e.target.value })}
                  placeholder="e.g., Food:Breakfast:Pancakes"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Full item path in QuickBooks (e.g., Category:Subcategory:Item)
                </p>
              </div>

              {/* Sync Inventory Toggle */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={newMapping.sync_inventory}
                    onChange={(e) => setNewMapping({ ...newMapping, sync_inventory: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3">
                  <label className="font-medium text-gray-700 text-sm">
                    Enable Inventory Sync
                  </label>
                  <p className="text-xs text-gray-500">
                    Sync inventory levels bi-directionally with QuickBooks
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>Create Mapping</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickBooksItemMapping;
