"use client";

/* eslint-disable @next/next/no-img-element */
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getCookie } from "@/lib/cookies";
import {
  Book,
  CircleUserRound,
  Grip,
  LogIn,
  LogOut,
  MailQuestion,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type CookieUserDetails = {
  name?: string;
  picture?: string;
  provider_id?: string;
  provider_name?: string;
};

function useCookieUserDetails() {
  return useMemo(() => {
    const raw = getCookie("_b_ud");
    if (!raw) return null;

    try {
      return JSON.parse(decodeURIComponent(raw)) as CookieUserDetails;
    } catch {
      return null;
    }
  }, []);
}

export default function WidgetUserAvatar() {
  const userDetails = useCookieUserDetails();
  const isAuthenticated = !!userDetails;

  return (
    <Popover>
      <PopoverTrigger
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/15 hover:text-white"
        title={isAuthenticated ? userDetails.name || "Account" : "Account"}
      >
        {isAuthenticated ? (
          <img
            src={userDetails.picture}
            alt={userDetails.name || "User"}
            className="h-6 w-6 rounded-full border border-white/35 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <CircleUserRound className="h-4 w-4" />
        )}
        <span className="hidden md:inline">
          {isAuthenticated
            ? userDetails.name?.split(" ")[0] || "Account"
            : "Login"}
        </span>
      </PopoverTrigger>

      <PopoverContent className="mr-4 w-max overflow-hidden bg-slate-50 p-0 shadow-md">
        {isAuthenticated ? (
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2">
              <div>
                <div className="font-medium">{userDetails.name}</div>
                <div className="text-xs">{userDetails.provider_id}</div>
                <div className="mt-1 inline-block rounded-xl bg-gray-600 px-2 py-1 text-xs font-light text-whitesmoke">
                  Signed-in with {userDetails.provider_name}
                </div>
              </div>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-slate-300" />
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/apps" className="flex items-center gap-x-2">
                <Grip size={16} color="#808080" />
                Apps
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/about" className="flex items-center gap-x-2">
                <Book size={16} color="#808080" />
                About
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/contact" className="flex items-center gap-x-2">
                <MailQuestion size={16} color="#808080" />
                Contact us
              </Link>
            </li>
            <li className="rounded-br-md rounded-bl-md px-3 py-2 hover:bg-slate-200">
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="flex cursor-pointer items-center gap-x-2"
                >
                  <LogOut size={16} color="#808080" />
                  Logout
                </button>
              </form>
            </li>
          </ul>
        ) : (
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2">
              <div>
                <div className="font-medium">
                  Welcome to {process.env.NEXT_PUBLIC_APP_TITLE}.
                </div>
                <div className="text-xs text-gray-600">
                  Login and be part of us.
                </div>
              </div>
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/login" className="flex items-center gap-x-2">
                <LogIn size={16} color="#808080" />
                Login
              </Link>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-slate-300" />
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/apps" className="flex items-center gap-x-2">
                <Grip size={16} color="#808080" />
                Apps
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/about" className="flex items-center gap-x-2">
                <Book size={16} color="#808080" />
                About
              </Link>
            </li>
            <li className="px-3 py-2 hover:bg-slate-200">
              <Link href="/contact" className="flex items-center gap-x-2">
                <MailQuestion size={16} color="#808080" />
                Contact us
              </Link>
            </li>
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
