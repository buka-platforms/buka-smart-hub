import Search from "@/components/General/Search";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { User, UserSession } from "@/data/type";
import {
  Book,
  CircleUserRound,
  Grip,
  LogIn,
  LogOut,
  MailQuestion,
} from "lucide-react";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
const Authenticated = ({ userDetails }: { userDetails: User }) => {
  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div>
            <img
              src={userDetails.picture}
              alt={userDetails.name}
              title={userDetails.name}
              className="h-9 w-9 cursor-pointer rounded-full border-2 border-slate-600 opacity-100 shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="mr-4 w-max bg-slate-50 p-0 text-sm shadow-md md:text-base">
          <ul className="no-bullet no-padding">
            <li className="cursor-auto rounded-tl-md rounded-tr-md px-3 py-2 hover:bg-slate-200">
              <div>
                <div className="font-medium">{userDetails.name}</div>
                <div className="text-xs">{userDetails.provider_id}</div>
                <div className="mt-1 text-xs text-gray-400">
                  Signed-in with {userDetails.provider_name}
                </div>
              </div>
            </li>
            <li>
              <hr className="border-b-0 border-slate-300" />
            </li>
            {/* <li className="px-3 py-1 hover:bg-slate-200 md:py-2">Settings</li> */}
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
              <Link href="/apps" className="flex items-center gap-x-2">
                <Grip size={16} color="#808080" />
                Apps
              </Link>
            </li>
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
              <Link href="/about" className="flex items-center gap-x-2">
                <Book size={16} color="#808080" />
                About
              </Link>
            </li>
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
              <Link href="/contact" className="flex items-center gap-x-2">
                <MailQuestion size={16} color="#808080" />
                Contact us
              </Link>
            </li>
            <li className="rounded-br-md rounded-bl-md px-3 py-1 hover:bg-slate-200 md:py-2">
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

const NotAuthenticated = () => {
  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div>
            <CircleUserRound className="h-9 w-9 cursor-pointer text-slate-600 opacity-80 hover:opacity-100" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="mr-4 w-max bg-slate-50 p-0 text-sm shadow-md md:text-base">
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
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
              <Link href="/login" className="flex items-center gap-x-2">
                <LogIn size={16} color="#808080" />
                Login
              </Link>
            </li>
            <li>
              <hr className="my-1 border-b-0 border-slate-300" />
            </li>
            {/* <li className="px-3 py-1 hover:bg-slate-200 md:py-2">Settings</li> */}
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
              <Link href="/apps" className="flex items-center gap-x-2">
                <Grip size={16} color="#808080" />
                Apps
              </Link>
            </li>
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
              <Link href="/about" className="flex items-center gap-x-2">
                <Book size={16} color="#808080" />
                About
              </Link>
            </li>
            <li className="px-3 py-1 hover:bg-slate-200 md:py-2">
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
export default function SignedInHeader({
  userSession,
}: {
  userSession: UserSession;
}) {
  const { is_authenticated, user_details } = userSession;

  return (
    <>
      <header className="sticky top-0 z-10 bg-white shadow-[0_1px_#0000001f]">
        <nav className="flex h-16 items-center px-5 py-3">
          <div className="flex gap-x-1">
            <Link href="/" title={`${process.env.NEXT_PUBLIC_APP_TITLE} home`}>
              <img
                src="/assets/images/logo-black.svg"
                alt="Buka"
                className="h-8 w-8"
              />
            </Link>
          </div>
          <div className="flex grow px-3 md:px-7"></div>
          <div className="flex items-center gap-x-3">
            <div title="Search" className="flex cursor-pointer items-center">
              <Search className="h-6 w-6 cursor-pointer text-slate-600 opacity-80 hover:opacity-100 md:h-6 md:w-6" />
            </div>
            {!is_authenticated ? (
              <NotAuthenticated />
            ) : (
              <Authenticated userDetails={user_details as User} />
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
