"use client";

/* eslint-disable @next/next/no-img-element */
import { LogoutButton } from "@/components/auth/logout-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAuthenticatedApi } from "@/lib/authenticated-api";
import pkg from "@/package.json";
import {
  Book,
  BookOpen,
  CircleUserRound,
  Grip,
  LogIn,
  LogOut,
  MailQuestion,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type VerifiedSession = {
  is_authenticated?: boolean;
  user_details?: {
    name?: string;
    picture?: string;
    first_name?: string;
    provider_id?: string;
    provider_name?: string;
  } | null;
  data?: {
    is_authenticated?: boolean;
    user_details?: {
      name?: string;
      picture?: string;
      first_name?: string;
      provider_id?: string;
      provider_name?: string;
    } | null;
  };
};

export default function WidgetUserAvatar() {
  const [session, setSession] = useState<VerifiedSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void fetchAuthenticatedApi("/api/auth/session", {
      method: "GET",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as VerifiedSession;
      })
      .then((payload) => {
        if (!mounted) return;
        const resolved =
          payload && typeof payload.is_authenticated === "boolean"
            ? payload
            : payload?.data &&
                typeof payload.data.is_authenticated === "boolean"
              ? payload.data
              : { is_authenticated: false };
        setSession(resolved);
      })
      .catch(() => {
        if (!mounted) return;
        setSession({ is_authenticated: false });
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const userDetails = session?.user_details || null;
  const isAuthenticated = session?.is_authenticated === true;

  return (
    <Popover>
      <PopoverTrigger
        className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border bg-secondary/50 px-3 text-xs font-medium text-secondary-foreground backdrop-blur transition-all hover:bg-accent hover:text-accent-foreground"
        title={isAuthenticated ? userDetails?.name || "Account" : "Account"}
      >
        {loading ? (
          <>
            <Skeleton className="h-6 w-6 rounded-full bg-muted" />
            <div className="hidden md:block">
              <Skeleton className="h-4 w-16 rounded bg-muted" />
            </div>
          </>
        ) : isAuthenticated ? (
          <img
            src={userDetails?.picture}
            alt={userDetails?.name || "User"}
            className="h-6 w-6 rounded-full border border-border object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <CircleUserRound className="h-4 w-4" />
        )}
        {!loading && (
          <span className="hidden md:inline">
            {isAuthenticated
              ? userDetails?.name?.split(" ")[0] || "Account"
              : "Login"}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent className="mr-4 w-max overflow-hidden bg-popover p-0 shadow-md">
        {loading ? (
          <div className="space-y-3 px-3 py-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : isAuthenticated ? (
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2">
              <div>
                <div className="font-medium">{userDetails?.name}</div>
                <div className="text-xs">{userDetails?.provider_id}</div>
                <div className="mt-1 inline-block rounded-xl bg-muted px-2 py-1 text-xs font-light text-muted-foreground">
                  Signed-in with {userDetails?.provider_name}
                </div>
              </div>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-border" />
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/apps" className="flex items-center gap-x-2">
                <Grip size={16} className="text-muted-foreground" />
                Apps
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/about" className="flex items-center gap-x-2">
                <Book size={16} className="text-muted-foreground" />
                About
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/credits" className="flex items-center gap-x-2">
                <BookOpen size={16} className="text-muted-foreground" />
                Credits
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/contact" className="flex items-center gap-x-2">
                <MailQuestion size={16} className="text-muted-foreground" />
                Contact us
              </Link>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-border" />
            </li>
            <li className="cursor-auto px-3 pt-2 pb-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">
                  {process.env.NEXT_PUBLIC_APP_TITLE}
                </span>
                <span className="rounded-sm bg-muted p-1 px-2 text-xs text-muted-foreground">
                  v{pkg.version}
                </span>
              </div>
            </li>
            <li className="rounded-br-md rounded-bl-md">
              <LogoutButton className="flex w-full cursor-pointer items-center gap-x-2 px-3 py-2 text-left hover:bg-accent">
                <LogOut size={16} className="text-muted-foreground" />
                Logout
              </LogoutButton>
            </li>
          </ul>
        ) : (
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2">
              <div>
                <div className="font-medium">
                  Welcome to {process.env.NEXT_PUBLIC_APP_TITLE}.
                </div>
                <div className="text-xs text-muted-foreground">
                  Login and be part of us.
                </div>
              </div>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/login" className="flex items-center gap-x-2">
                <LogIn size={16} className="text-muted-foreground" />
                Login
              </Link>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-border" />
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/apps" className="flex items-center gap-x-2">
                <Grip size={16} className="text-muted-foreground" />
                Apps
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/about" className="flex items-center gap-x-2">
                <Book size={16} className="text-muted-foreground" />
                About
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/credits" className="flex items-center gap-x-2">
                <BookOpen size={16} className="text-muted-foreground" />
                Credits
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-accent">
              <Link href="/contact" className="flex items-center gap-x-2">
                <MailQuestion size={16} className="text-muted-foreground" />
                Contact us
              </Link>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-border" />
            </li>
            <li className="cursor-auto rounded-br-md rounded-bl-md px-3 pt-2 pb-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">
                  {process.env.NEXT_PUBLIC_APP_TITLE}
                </span>
                <span className="rounded-sm bg-muted p-1 px-2 text-xs text-muted-foreground">
                  v{pkg.version}
                </span>
              </div>
            </li>
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
