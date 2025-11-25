
import { Puzzle } from 'lucide-react';

import { FileText } from 'lucide-react';


export const reportsSidebarMenus = {
    id: 'reports',
    title: 'Reports',
    url: '/console/reports',

//    icon: Puzzle, // TODO: Change to appropriate icon
//    roles: 'ADMIN', 
//    permissions: ['reports.view'],
//    items: [
//      {
//        id: "reports-list",
//        title: "Reports List",
//        url: "/console/reports",
//        roles: "ADMIN",
//        permissions: "reports.view",

    icon: FileText,
    roles: 'ADMIN',
    permissions: ['reports.view'],
    items: [
      {
        id: "audit-log",
        title: "Audit Log",
        url: "/console/reports/audit-log",
        roles: "ADMIN",
        permissions: "reports.audit-log.view",
      },
      {
        id: "financial-report",
        title: "Financial Report",
        url: "/console/reports/financial-report",
        roles: "ADMIN",
        permissions: "reports.financial-report.view",
      },
    ],
  };
