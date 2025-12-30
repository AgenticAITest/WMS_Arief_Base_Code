import { RouteObject } from 'react-router';
import Partner from '../pages/partner/PartnerList';
import PartnerAdd from '../pages/partner/PartnerAdd';
import PartnerEdit from '../pages/partner/PartnerEdit';
import PartnerDetail from '../pages/partner/PartnerDetail';
import WebhookEventList from '../pages/webhook-event/WebhookEventList';
import WebhookEventAdd from '../pages/webhook-event/WebhookEventAdd';
import WebhookEventDetail from '../pages/webhook-event/WebhookEventDetail';
import WebhookEventEdit from '../pages/webhook-event/WebhookEventEdit';
import WebhookList from '../pages/webhook/WebhookList';
import WebhookAdd from '../pages/webhook/WebhookAdd';
import WebhookDetail from '../pages/webhook/WebhookDetail';
import WebhookEdit from '../pages/webhook/WebhookEdit';
import ApiKeyList from '../pages/api-key/ApiKeyList';
import ApiKeyAdd from '../pages/api-key/ApiKeyAdd';
import ApiKeyDetail from '../pages/api-key/ApiKeyDetail';
import ApiKeyEdit from '../pages/api-key/ApiKeyEdit';

export const integrationReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { 
        path: "partner", 
        children: [
          { index: true, Component: Partner },
          { path: "add", Component: PartnerAdd },
          { path: ":id", Component: PartnerDetail },
          { path: ":id/edit", Component: PartnerEdit },
          { path: ":id/delete"}
        ]
      },
      { 
        path: "event", 
        children: [
          { index: true, Component: WebhookEventList },
          { path: "add", Component: WebhookEventAdd },
          { path: ":id", Component: WebhookEventDetail },
          { path: ":id/edit", Component: WebhookEventEdit },
          { path: ":id/delete"}
        ]
      },
      { 
        path: "webhook", 
        children: [
          { index: true, Component: WebhookList },
          { path: "add", Component: WebhookAdd },
          { path: ":id", Component: WebhookDetail },
          { path: "edit/:id", Component: WebhookEdit },
          { path: ":id/delete"}
        ]
      },
      { 
        path: "api-key", 
        children: [
          { index: true, Component: ApiKeyList },
          { path: "add", Component: ApiKeyAdd },
          { path: ":id", Component: ApiKeyDetail },
          { path: ":id/edit", Component: ApiKeyEdit },
          { path: ":id/delete"}
        ]
      },
    ]
  };
};
