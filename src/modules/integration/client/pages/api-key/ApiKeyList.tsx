import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@client/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { Badge } from '@client/components/ui/badge';
import { Trash2, Edit, Eye, Plus, Search, Filter } from 'lucide-react';
import Breadcrumbs, { createBreadcrumbItems, useBreadcrumbs } from '@client/components/console/Breadcrumbs';
import { apiKeyApi } from '../../lib/api/apiKeyApi';
import { ApiKey, ApiKeyQueryParams } from '../../schemas/apiKeySchema';
import { useAuth } from '@client/provider/AuthProvider';
import { toast } from 'sonner';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const ApiKeyList = () => {
  const navigate = useNavigate();
  const { isAuthorized } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Pagination and filtering state
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState<ApiKeyQueryParams>({
    page: 1,
    perPage: 10,
    sort: 'createdAt',
    order: 'desc',
    filter: '',
    status: undefined
  });

  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Api Key",
      },
    ])
  );

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiKeyApi.getApiKeys(filters);
      setApiKeys(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized(["ADMIN"], ['integration.apiKey.view'])) {
      loadApiKeys();
    }
  }, [filters, isAuthorized]);

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, filter: searchTerm, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ 
      ...prev, 
      status: status === 'all' ? undefined : status as 'active' | 'inactive',
      page: 1 
    }));
  };

  const handleSort = (sort: string) => {
    setFilters(prev => ({ 
      ...prev, 
      sort: sort as 'apiKey' | 'status' | 'createdAt' | 'updatedAt',
      order: prev.sort === sort && prev.order === 'asc' ? 'desc' : 'asc',
      page: 1 
    }));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      setDeleting(id);
      await apiKeyApi.deleteApiKey(id);
      toast.success('API key deleted successfully');
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete API key');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>
    );
  };

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return apiKey;
    return `${apiKey.substring(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.substring(apiKey.length - 4)}`;
  };

  if (!isAuthorized(["ADMIN"], ['integration.apiKey.view'])) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to view API keys.</p>
      </div>
    );
  }

  return (
    <div className="mx-2 space-y-6">
      {/* <Breadcrumbs items={breadcrumbs} /> */}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-gray-600">Manage API keys for partner integrations</p>
        </div>
        {isAuthorized(["ADMIN"], ['integration.apiKey.add']) && (
          <Button onClick={() => navigate('/console/modules/integration/api-key/add')}>
            <Plus className="w-4 h-4 mr-2" />
            Add API Key
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search API keys..."
                  value={filters.filter || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">No API keys found.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('apiKey')}
                    >
                      API Key {filters.sort === 'apiKey' && (filters.order === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('status')}
                    >
                      Status {filters.sort === 'status' && (filters.order === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('createdAt')}
                    >
                      Created {filters.sort === 'createdAt' && (filters.order === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {maskApiKey(item.apiKey)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.partnerName}</div>
                          <div className="text-sm text-gray-500">{item.partnerCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {isAuthorized(["ADMIN"], ['integration.apiKey.view']) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/console/modules/integration/api-key/${item.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {isAuthorized(["ADMIN"], ['integration.apiKey.edit']) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/console/modules/integration/api-key/${item.id}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isAuthorized(["ADMIN"], ['integration.apiKey.delete']) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleting === item.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
                  {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
                  {pagination.total} entries
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(ApiKeyList, {
  moduleId: 'integration',
  moduleName: 'Integration'
});