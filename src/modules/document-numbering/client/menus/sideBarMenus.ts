import { FileText } from 'lucide-react';

export const documentNumberingSidebarMenus = {
    id: 'document-numbering',
    title: 'Document Numbering',
    url: '/console/modules/document-numbering',
    icon: FileText,
    roles: 'ADMIN', 
    permissions: ['document-numbering.view'],
    items: [
      {
        id: "document-numbering-config",
        title: "Configuration",
        url: "/console/modules/document-numbering",
        roles: "ADMIN",
        permissions: "document-numbering.view",
      },
    ],
};
