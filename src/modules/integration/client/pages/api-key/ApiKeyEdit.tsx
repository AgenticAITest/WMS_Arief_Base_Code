import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import Breadcrumbs, { createBreadcrumbItems, useBreadcrumbs } from '@client/components/console/Breadcrumbs';
import { ApiKeyForm } from '../../components/forms/ApiKeyForm';
import { apiKeyApi } from '../../lib/api/apiKeyApi';
import { ApiKey, ApiKeyFormData } from '../../schemas/apiKeySchema';
import { useAuth } from '@client/provider/AuthProvider';
import { toast } from 'sonner';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const ApiKeyEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthorized } = useAuth();
  const [integrationInbound, setIntegrationInbound] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Api Key",
        onClick: () => navigate("/console/modules/integration/api-key"),
      },
      {
        label: integrationInbound ? `Edit ${integrationInbound.partnerName || 'API Key'}` : "Edit API Key",
      },
    ])
  );

  useEffect(() => {
    const loadIntegrationInbound = async () => {
      if (!id) {
        toast.error('API key ID is required');
        navigate('/console/modules/integration/api-key');
        return;
      }

      try {
        setLoading(true);
        const response = await apiKeyApi.getApiKey(id);
        setIntegrationInbound(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load API key');
        navigate('/console/modules/integration/api-key');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthorized(["ADMIN"], ['integration.apiKey.edit'])) {
      loadIntegrationInbound();
    }
  }, [id, navigate, isAuthorized]);

  const handleSubmit = async (data: ApiKeyFormData) => {
    if (!id) return;

    try {
      setIsSubmitting(true);
      await apiKeyApi.updateApiKey(id, data);
      toast.success('API key updated successfully');
      navigate('/console/modules/integration/api-key');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update API key');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/console/modules/integration/api-key');
  };

  if (!isAuthorized(["ADMIN"], ['integration.apiKey.edit'])) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to edit API keys.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading API key...</p>
      </div>
    );
  }

  if (!integrationInbound) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Integration inbound API key not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-2 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      <div>
        <h1 className="text-2xl font-bold">Edit API Key</h1>
        <p className="text-gray-600">Update the API key information</p>
      </div>

      <ApiKeyForm 
        apiKey={integrationInbound}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default withModuleAuthorization(ApiKeyEdit, {
  moduleId: 'integration',
  moduleName: 'Integration'
});