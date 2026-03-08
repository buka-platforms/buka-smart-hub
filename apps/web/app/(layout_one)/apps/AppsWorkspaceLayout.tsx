"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { apps } from "@/data/apps";
import type { UserSession } from "@/data/type";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CircleUserRound,
  LogIn,
  LogOut,
  PanelLeft,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

const initials = (name?: string) => {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

function AppsWorkspaceShell({
  children,
  userSession,
}: {
  children: React.ReactNode;
  userSession: UserSession;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const activeApp =
    apps.find(
      (app) => pathname === app.path || pathname.startsWith(`${app.path}/`),
    ) ?? null;

  return (
    <section className="h-dvh w-full overflow-hidden bg-slate-100/70">
      <div className="flex h-full w-full">
        <Sidebar
          className={cn(
            "border-r-slate-200 bg-white/90 backdrop-blur transition-[width] duration-200",
            collapsed ? "w-16" : "w-72",
          )}
        >
          <div className="flex h-full flex-col">
            <SidebarHeader className="space-y-0 border-b-0">
              <Link
                href="/"
                className={cn(
                  "flex items-center rounded-md transition hover:bg-slate-100",
                  collapsed ? "justify-center p-1.5" : "gap-2 p-1",
                )}
                aria-label="Back to home"
              >
                <Image
                  src="/assets/images/logo-black.svg"
                  alt="Buka logo"
                  width={28}
                  height={28}
                />
                {!collapsed && (
                  <p className="text-sm font-semibold">Buka Smart Home</p>
                )}
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {apps.map((app) => {
                  const isActive =
                    pathname === app.path ||
                    pathname.startsWith(`${app.path}/`);
                  return (
                    <SidebarMenuItem key={app.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(collapsed && "justify-center px-2")}
                      >
                        <Link
                          href={app.path}
                          prefetch={app.prefetch ?? true}
                          target={app.open_in_new_tab ? "_blank" : "_self"}
                          rel={
                            app.open_in_new_tab && app.secure_on_new_tab
                              ? "noopener noreferrer"
                              : undefined
                          }
                          title={collapsed ? app.name : undefined}
                        >
                          <Image
                            src={app.image_url}
                            alt={app.name}
                            width={18}
                            height={18}
                          />
                          {!collapsed && (
                            <span className="flex-1">{app.name}</span>
                          )}
                          {!collapsed && app.type && (
                            <Badge
                              className={cn(
                                "rounded-full px-2 py-0 text-[10px] uppercase",
                                app.type === "wip"
                                  ? "bg-orange-500"
                                  : "bg-emerald-500",
                              )}
                            >
                              {app.type}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              {userSession.is_authenticated && userSession.user_details ? (
                <div className="rounded-xl border bg-white/95 p-2 shadow-xs">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "flex w-full items-center rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring",
                          collapsed ? "justify-center" : "gap-3",
                        )}
                      >
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage
                            src={userSession.user_details.picture}
                            alt={userSession.user_details.name}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback>
                            {initials(userSession.user_details.name)}
                          </AvatarFallback>
                        </Avatar>
                        {!collapsed && (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {userSession.user_details.name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {userSession.user_details.provider_id ??
                                  `Signed in with ${userSession.user_details.provider_name}`}
                              </p>
                            </div>
                            <ChevronsUpDown className="size-4 text-slate-500" />
                          </>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="end"
                      sideOffset={12}
                      className="w-64 rounded-xl p-0"
                    >
                      <DropdownMenuLabel className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border">
                            <AvatarImage
                              src={userSession.user_details.picture}
                              alt={userSession.user_details.name}
                              referrerPolicy="no-referrer"
                            />
                            <AvatarFallback>
                              {initials(userSession.user_details.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {userSession.user_details.name}
                            </p>
                            <p className="truncate text-xs font-normal text-slate-500">
                              {userSession.user_details.provider_id ??
                                `Signed in with ${userSession.user_details.provider_name}`}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem>
                          <BadgeCheck className="mr-2 size-4" />
                          Account
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Bell className="mr-2 size-4" />
                          Notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Search className="mr-2 size-4" />
                          Search
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href="/logout">
                          <LogOut className="mr-2 size-4" />
                          Log out
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-lg border bg-white p-3",
                    collapsed && "p-2",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3",
                      collapsed && "justify-center",
                    )}
                  >
                    <div className="rounded-full border bg-slate-100 p-2 text-slate-600">
                      <CircleUserRound className="size-5" />
                    </div>
                    {!collapsed && (
                      <div>
                        <p className="text-sm font-medium">Guest Mode</p>
                        <p className="text-xs text-slate-500">
                          Login to sync your experience.
                        </p>
                      </div>
                    )}
                  </div>
                  {!collapsed && (
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href="/login">
                        <LogIn className="size-4" />
                        Login
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </SidebarFooter>
          </div>
        </Sidebar>
        <SidebarInset className="h-full overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="icon-sm"
                className="hidden cursor-pointer md:inline-flex"
                onClick={() => setCollapsed((value) => !value)}
              >
                <PanelLeft className="size-4" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
              <div className="hidden h-4 w-px bg-slate-300 md:block" />
              <Breadcrumb>
                <BreadcrumbList className="whitespace-nowrap">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  {activeApp ? (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                          <Link href="/apps">Apps</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{activeApp.name}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Apps</BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
          <div className="flex-1 p-4 md:p-8">{children}</div>
        </SidebarInset>
      </div>
    </section>
  );
}

export default function AppsWorkspaceLayout({
  children,
  userSession,
}: {
  children: React.ReactNode;
  userSession: UserSession;
}) {
  return (
    <SidebarProvider>
      <AppsWorkspaceShell userSession={userSession}>
        {children}
      </AppsWorkspaceShell>
    </SidebarProvider>
  );
}
