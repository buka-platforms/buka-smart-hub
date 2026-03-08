"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  SidebarRail,
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
  CreditCard,
  House,
  LogIn,
  LogOut,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function AppsWorkspaceLayout({
  children,
  userSession,
}: {
  children: React.ReactNode;
  userSession: UserSession;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <section className="w-full bg-slate-100/70">
        <div className="flex min-h-screen w-full">
          <Sidebar className="border-r-slate-200 bg-white/90 backdrop-blur">
            <div className="sticky top-0 flex h-screen flex-col">
              <SidebarHeader className="space-y-3">
                <Link href="/" className="flex items-center gap-2">
                  <Image
                    src="/assets/images/logo-black.svg"
                    alt="Buka logo"
                    width={28}
                    height={28}
                  />
                  <p className="text-sm font-semibold">Buka Smart Home</p>
                </Link>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  One place to launch your favorite tools quickly.
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarMenu>
                  {apps.map((app) => {
                    const isActive =
                      pathname === app.path ||
                      pathname.startsWith(`${app.path}/`);
                    return (
                      <SidebarMenuItem key={app.id}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link
                            href={app.path}
                            prefetch={app.prefetch ?? true}
                            target={app.open_in_new_tab ? "_blank" : "_self"}
                            rel={
                              app.open_in_new_tab && app.secure_on_new_tab
                                ? "noopener noreferrer"
                                : undefined
                            }
                          >
                            <Image
                              src={app.image_url}
                              alt={app.name}
                              width={18}
                              height={18}
                            />
                            <span className="flex-1">{app.name}</span>
                            {app.type && (
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
                        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring">
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
                            <CreditCard className="mr-2 size-4" />
                            Billing
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
                  <div className="rounded-lg border bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full border bg-slate-100 p-2 text-slate-600">
                        <CircleUserRound className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Guest Mode</p>
                        <p className="text-xs text-slate-500">
                          Login to sync your experience.
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href="/login">
                        <LogIn className="size-4" />
                        Login
                      </Link>
                    </Button>
                  </div>
                )}
              </SidebarFooter>
            </div>
          </Sidebar>
          <SidebarRail className="bg-white/70" />
          <SidebarInset className="min-h-screen bg-white">
            <div className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <SidebarTrigger />
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                  >
                    <Link href="/">
                      <House className="size-4" />
                      Home
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 md:p-8">{children}</div>
          </SidebarInset>
        </div>
      </section>
    </SidebarProvider>
  );
}
