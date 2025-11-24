import { Puzzle } from 'lucide-react';

export const generalSidebarMenus = {
    id: 'general',
    title: 'General',
    url: '/console/modules/general',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['general.view'],
    items: [
      {
        id: "general-list",
        title: "General List",
        url: "/console/modules/general",
        roles: "ADMIN",
        permissions: "general.view",
      },
    ],
  };
