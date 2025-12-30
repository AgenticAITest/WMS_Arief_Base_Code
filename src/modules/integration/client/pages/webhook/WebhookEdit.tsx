import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import Breadcrumbs, { createBreadcrumbItems, useBreadcrumbs } from '@client/components/console/Breadcrumbs';
import WebhookForm from '../../components/forms/WebhookForm';
import { webhookApi } from '../../lib/api/webhookApi';
import { partnerApi } from '../../lib/api/partnerApi';
import { WebhookFormData, Webhook } from '../../schemas/webhookSchema';
import { Partner } from '../../schemas/partnerSchema';
import { useAuth } from '@client/provider/AuthProvider';
import { toast } from 'sonner';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

const WebhookEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthorized } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [loading, setLoading] = useState(true);

  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Webhooks",
        href: "/console/modules/integration/webhook",
      },
      {
        label: webhook ? `Edit ${webhook.eventType}` : "Edit Webhook",
      },
    ])
  );

  // Load webhook details and partners
  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        navigate('/console/modules/integration/webhook');
        return;
      }

      try {
        setLoading(true);
        
        // Load webhook details and partners in parallel
        const [webhookResponse, partnersResponse] = await Promise.all([
          webhookApi.getById(id),
          partnerApi.getPartners({ page: 1, perPage: 100 })
        ]);
        
        setWebhook(webhookResponse.data);
        setPartners(partnersResponse.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load webhook details');
        navigate('/console/modules/integration/webhook');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleSubmit = async (data: WebhookFormData) => {
    if (!id || !webhook) return;

    try {
      setIsLoading(true);
      await webhookApi.update(id, { ...data, id });
      toast.success('Webhook updated successfully');
      navigate('/console/modules/integration/webhook');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update webhook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/console/modules/integration/webhook');
  };

  if (!isAuthorized(["ADMIN"], ['integration.webhook.edit'])) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">You don't have permission to edit webhooks.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading webhook details...</p>
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Webhook not found.</p>
      </div>
    );
  }

  const initialData: Partial<WebhookFormData> = {
    partnerId: webhook.partnerId,
    eventType: webhook.eventType,
    url: webhook.url,
    isActive: webhook.isActive,
  };

  return (
    <div className="mx-2 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Webhook</h1>
        <p className="text-muted-foreground">
          Update webhook endpoint configuration and event monitoring settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Modify the webhook endpoint details and event type settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookForm
            initialData={initialData}
            partners={partners}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            isEdit={true}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default withModuleAuthorization(WebhookEdit, {
  moduleId: 'integration',
  moduleName: 'Integration'
});