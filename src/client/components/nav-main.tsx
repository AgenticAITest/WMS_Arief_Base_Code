"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@client/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@client/components/ui/sidebar";
import { useState } from "react";
import { NavLink } from "react-router";
import Authorized from "./auth/Authorized";
import { useModuleAuthorization } from "@client/hooks/useModuleAuthorization";

interface NavSubSubItem {
  id: string;
  title: string;
  url: string;
  isActive?: boolean;
  roles?: string | string[];
  permissions?: string | string[];
}

interface NavSubItem {
  id: string;
  title: string;
  url: string;
  isActive?: boolean;
  roles?: string | string[];
  permissions?: string | string[];
  items?: NavSubSubItem[];
}

interface NavItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  roles?: string | string[];
  permissions?: string | string[];
  items?: NavSubItem[];
}

export function NavMain({
  items,
}: {
  items: NavItem[];
}) {

  const { isModuleAuthorized } = useModuleAuthorization();
  const [activePath, setActivePath] = useState(window.location.pathname);

  function isActive(path:string) : boolean {
    return (activePath.startsWith(path));
  }

  
  const canAccessModule = (item: NavItem): boolean => {
    if (item.url.startsWith('/console/modules/')) {
      return isModuleAuthorized(item.id);
    }
    return true;
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) =>
          item.items ? (
            canAccessModule(item) && (
              <Authorized roles={item.roles} permissions={item.permissions} key={item.id}>
                <Collapsible
                  key={item.id}
                  asChild
                  defaultOpen={isActive(item.url)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem key={item.id}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => 
                          subItem.items ? (
                            // Second level submenu (nested)
                            <Authorized roles={item.roles} permissions={subItem.permissions} key={subItem.id}>
                              <Collapsible
                                key={subItem.id}
                                asChild
                                defaultOpen={isActive(subItem.url)}
                                className="group/collapsible-sub"
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton>
                                      <span>{subItem.title}</span>
                                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible-sub:rotate-90" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub>
                                      {subItem.items?.map((subSubItem) => (
                                        <Authorized roles={subItem.roles} permissions={subSubItem.permissions} key={subSubItem.id}>
                                          <SidebarMenuSubItem key={subSubItem.id} className="pl-0">
                                            <SidebarMenuSubButton asChild isActive={isActive(subSubItem.url)} onClick={() => setActivePath(subSubItem.url)}>
                                              <NavLink to={subSubItem.url}>
                                                <span>{subSubItem.title}</span>
                                              </NavLink>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        </Authorized>
                                      ))}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            </Authorized>
                          ) : (
                            // First level submenu (no nested items)
                            <Authorized roles={item.roles} permissions={subItem.permissions} key={subItem.id}>
                              <SidebarMenuSubItem key={subItem.id}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)} onClick={() => setActivePath(subItem.url)}>
                                  <NavLink to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </Authorized>
                          )
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </Authorized>
            )
          ) : (
            <Authorized roles={item.roles} permissions={item.permissions} key={item.id}>
              <SidebarMenuItem key={item.id}>
                <NavLink to={item.url}>
                  <SidebarMenuButton className="cursor-pointer" tooltip={item.title} isActive={isActive(item.url)} onClick={() => setActivePath(item.url)}>
                    {item.icon && <item.icon />}
                      <span>{item.title}</span>
                  </SidebarMenuButton>
                </NavLink>
              </SidebarMenuItem>
            </Authorized>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
