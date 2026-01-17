import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { User } from "@/data/type";
import { checkUserSession } from "@/lib/user";
import {
  Book,
  CircleUserRound,
  Grip,
  LogIn,
  LogOut,
  MailQuestion,
} from "lucide-react";
import Link from "next/link";

const NotAuthenticated = () => {
  return (
    <>
      <Popover>
        <PopoverTrigger>
          <CircleUserRound
            className="h-8 w-8 cursor-pointer opacity-80 hover:opacity-100 md:h-10 md:w-10"
            color="#f5f5f5"
          />
        </PopoverTrigger>
        <PopoverContent className="mr-4 w-max overflow-hidden bg-slate-50 p-0 shadow-md">
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2">
              <div>
                <div className="font-medium">
                  Hi you! Welcome to {process.env.NEXT_PUBLIC_APP_TITLE}.
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
        </PopoverContent>
      </Popover>
    </>
  );
};

/* eslint-disable @next/next/no-img-element */
const Authenticated = ({ userDetails }: { userDetails: User }) => {
  return (
    <>
      <Popover>
        <PopoverTrigger>
          <img
            src={userDetails.picture}
            alt={userDetails.name}
            title={userDetails.name}
            className="h-8 w-8 cursor-pointer rounded-full border-2 border-slate-600 opacity-100 shadow-xs md:h-10 md:w-10"
            referrerPolicy="no-referrer"
          />
        </PopoverTrigger>
        <PopoverContent className="mr-4 w-max bg-slate-50 p-0 shadow-md">
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2 hover:bg-slate-200">
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
            {/* <li className="px-3 hover:bg-slate-200 py-2">Settings</li> */}
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
              <a href="/logout" className="flex items-center gap-x-2">
                <LogOut size={16} color="#808080" />
                Logout
              </a>
            </li>
          </ul>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default async function UserAvatar() {
  const { is_authenticated, user_details } = await checkUserSession();

  return (
    <>
      {!is_authenticated ? (
        <NotAuthenticated />
      ) : (
        <Authenticated userDetails={user_details as User} />
      )}
    </>
  );
}
