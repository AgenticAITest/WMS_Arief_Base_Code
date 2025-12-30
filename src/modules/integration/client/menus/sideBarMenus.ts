import { Puzzle } from 'lucide-react';

export const integrationSidebarMenus = {
    id: 'integration',
    title: 'Integration',
    url: '/console/modules/integration',
    icon: Puzzle, 
    roles: 'ADMIN', 
    permissions: ['integration.partner.view', 'integration.event.view', 'integration.webhook.view'],
    items: [
      {
        id: "integration-partner",
        title: "Partner",
        url: "/console/modules/integration/partner",
        roles: "ADMIN",
        permissions: "integration.partner.view",
      },
      {
        id: "integration-event",
        title: "Event",
        url: "/console/modules/integration/event",
        roles: "ADMIN",
        permissions: "integration.event.view",
      },
      {
        id: "integration-webhook",
        title: "Webhook",
        url: "/console/modules/integration/webhook",
        roles: "ADMIN",
        permissions: "integration.webhook.view",
      },
      {
        id: "integration-api-key",
        title: "API Key",
        url: "/console/modules/integration/api-key",
        roles: "ADMIN",
        permissions: "integration.apiKey.view",
      },
    ],
  };
