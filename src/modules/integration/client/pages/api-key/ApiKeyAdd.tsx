import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import Breadcrumbs, { createBreadcrumbItems, useBreadcrumbs } from '@client/components/console/Breadcrumbs';
import { ApiKeyForm } from '../../components/forms/ApiKeyForm';
import { apiKeyApi } from '../../lib/api/apiKeyApi';
import { ApiKeyFormData } from '../../schemas/apiKeySchema';
import { useAuth } from '@client/provider/AuthProvider';
import { toast } from 'sonner';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const ApiKeyAdd = () => {
  const navigate = useNavigate();
  const { isAuthorized } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Api Key",
        onClick: () => navigate("/console/modules/integration/api-key"),
      },
      {
        label: "Add API Key",
      },
    ])
  );

  const handleSubmit = async (data: ApiKeyFormData) => {
    try {
      setIsLoading(true);
      await apiKeyApi.createApiKey(data);
      toast.success('API key created successfully');
      navigate('/console/modules/integration/api-key');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create API key');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/console/modules/integration/api-key');
  };

  if (!isAuthorized(["ADMIN"], ['integration.apiKey.add'])) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to add API keys.</p>
      </div>
    );
  }

  return (
    <div className="mx-2 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      <div>
        <h1 className="text-2xl font-bold">Add New API Key</h1>
        <p className="text-gray-600">Create a new API key for partner integration access</p>
      </div>

      <ApiKeyForm 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default withModuleAuthorization(ApiKeyAdd, {
  moduleId: 'integration',
  moduleName: 'Integration'
});