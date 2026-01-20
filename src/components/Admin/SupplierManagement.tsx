import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Search, Phone, Mail, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { purchaseOrdersService, Supplier } from '@/lib/api/purchase-orders';
import { useToast } from '@/hooks/use-toast';
import SupplierDialog from './SupplierDialog';

const SupplierManagement: React.FC = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, [statusFilter]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersService.getSuppliers({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setSuppliers(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load suppliers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedSupplier(null);
    if (refresh) {
      loadSuppliers();
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'destructive'> = {
      active: 'success',
      inactive: 'default',
      blocked: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-gray-400 text-sm">Not rated</span>;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Supplier Management</h2>
          <p className="text-gray-600 mt-1">Manage your vendors and suppliers</p>
        </div>
        <Button onClick={handleCreateSupplier} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search suppliers by name, code, or contact person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive', 'blocked'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading suppliers...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">
            {searchTerm ? 'No suppliers found matching your search.' : 'No suppliers yet. Create your first supplier to get started.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{supplier.name}</h3>
                  <p className="text-sm text-gray-500">{supplier.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(supplier.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSupplier(supplier)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {supplier.contact_person && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Contact:</span>
                    <span>{supplier.contact_person}</span>
                  </div>
                )}

                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${supplier.phone}`} className="hover:text-blue-600">
                      {supplier.phone}
                    </a>
                  </div>
                )}

                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${supplier.email}`} className="hover:text-blue-600">
                      {supplier.email}
                    </a>
                  </div>
                )}

                {supplier.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}

                {supplier.payment_terms && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">Payment Terms:</span>
                    <Badge variant="outline">{supplier.payment_terms}</Badge>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm font-medium text-gray-700">Rating:</span>
                  {renderStars(supplier.rating)}
                </div>

                {supplier.credit_limit && (
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <span className="font-medium text-gray-700">Credit Limit:</span>
                    <span className="text-green-600 font-semibold">
                      KES {supplier.credit_limit.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Supplier Dialog */}
      <SupplierDialog
        open={dialogOpen}
        supplier={selectedSupplier}
        onClose={handleDialogClose}
      />
    </div>
  );
};

export default SupplierManagement;
