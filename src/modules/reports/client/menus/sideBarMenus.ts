
import { Puzzle } from 'lucide-react';

import { FileText } from 'lucide-react';


export const reportsSidebarMenus = {
    id: 'reports',
    title: 'Reports',
    url: '/console/modules/reports',
    icon: FileText,
    roles: 'ADMIN',
    permissions: ['reports.view'],
    items: [
      {
        id: "audit-log",
        title: "Audit Log",
        url: "/console/modules/reports/audit-log",
        roles: "ADMIN",
        permissions: "reports.audit-log.view",
      },
      {
        id: "financial-report",
        title: "Financial Report",
        url: "/console/modules/reports/financial-report",
        roles: "ADMIN",
        permissions: "reports.financial-report.view",
      },
    ],
  };
