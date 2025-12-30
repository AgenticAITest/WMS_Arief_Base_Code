import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import Breadcrumbs, { createBreadcrumbItems, useBreadcrumbs } from '@client/components/console/Breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { useAuth } from '@client/provider/AuthProvider';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import WebhookEventForm from '../../components/forms/WebhookEventForm';
import { webhookEventApi } from '../../lib/api/webhookEventApi';
import { WebhookEventFormData } from '../../schemas/webhookEventSchema';


const WebhookEventAdd = () => {
  const navigate = useNavigate();
  const { isAuthorized } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Webhook Events",
        href: "/console/modules/integration/event",
      },
      {
        label: "Add Event",
      },
    ])
  );

  const handleSubmit = async (data: WebhookEventFormData) => {
    try {
      setIsLoading(true);
      await webhookEventApi.createEvent(data);
      toast.success('Webhook event created successfully');
      navigate('/console/modules/integration/event');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create webhook event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/console/modules/integration/event');
  };

  if (!isAuthorized(["ADMIN"], ['integration.event.create'])) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to create webhook events.</p>
      </div>
    );
  }

  return (
    <div className="mx-2 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div>
        <div>
          <h1 className="text-2xl font-bold">Add Webhook Event</h1>
          <p className="text-gray-600">
            Create a new webhook event type that can trigger notifications
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Define the webhook event name and description. The event name should follow the format: resource.action (e.g., user.created)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookEventForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default withModuleAuthorization(WebhookEventAdd, {
  moduleId: 'integration',
  moduleName: 'Integration'
});