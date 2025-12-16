import { Puzzle, Settings } from 'lucide-react';

export const workflowSidebarMenus = {
    id: 'workflow',
    title: 'Workflow',
    url: '/console/modules/workflow',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['workflow.view'],
    items: [
      // {
      //   id: "workflow-list",
      //   title: "Workflow List",
      //   url: "/console/modules/workflow",
      //   roles: "ADMIN",
      //   permissions: "workflow.view",
      // },
      {
        id: "workflow-settings",
        title: "Workflow Settings",
        url: "/console/modules/workflow/settings",
        roles: "ADMIN",
        permissions: "workflow.view",
        icon: Settings,
      },
    ],
  };
