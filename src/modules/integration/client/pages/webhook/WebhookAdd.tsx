import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import Breadcrumbs, { createBreadcrumbItems, useBreadcrumbs } from '@client/components/console/Breadcrumbs';
import WebhookForm from '../../components/forms/WebhookForm';
import { webhookApi } from '../../lib/api/webhookApi';
import { partnerApi } from '../../lib/api/partnerApi';
import { WebhookFormData } from '../../schemas/webhookSchema';
import { Partner } from '../../schemas/partnerSchema';
import { useAuth } from '@client/provider/AuthProvider';
import { toast } from 'sonner';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const WebhookAdd = () => {
  const navigate = useNavigate();
  const { isAuthorized } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);

  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Webhooks",
        href: "/console/modules/integration/webhook",
      },
      {
        label: "Add Webhook",
      },
    ])
  );

  // Load partners for the dropdown
  useEffect(() => {
    const loadPartners = async () => {
      try {
        const response = await partnerApi.getPartners({ page: 1, perPage: 100 });
        setPartners(response.data);
      } catch (error) {
        console.error('Failed to load partners:', error);
        toast.error('Failed to load partners');
      }
    };

    loadPartners();
  }, []);

  const handleSubmit = async (data: WebhookFormData) => {
    try {
      setIsLoading(true);
      await webhookApi.create(data);
      toast.success('Webhook created successfully');
      navigate('/console/modules/integration/webhook');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create webhook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/console/modules/integration/webhook');
  };

  if (!isAuthorized(["ADMIN"], ['integration.webhook.create'])) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">You don't have permission to create webhooks.</p>
      </div>
    );
  }

  return (
    <div className="mx-2 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Webhook</h1>
        <p className="text-muted-foreground">
          Create a new webhook endpoint to receive event notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Configure the webhook endpoint details and select which events to monitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookForm
            partners={partners}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(WebhookAdd, {
  moduleId: 'integration',
  moduleName: 'Integration'
});