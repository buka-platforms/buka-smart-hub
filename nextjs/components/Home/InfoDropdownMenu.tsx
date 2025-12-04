"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import pkg from "@/package.json";
import {
  Book,
  FlaskConical,
  Info as InfoIcon,
  MailQuestion,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function InfoDropdownMenu() {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="cursor-pointer"
          title={`${process.env.NEXT_PUBLIC_BUKA_APP_TITLE} information`}
        >
          <InfoIcon className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            Buka
            <span className="rounded-sm bg-gray-900 p-1 px-2 text-xs text-slate-300">
              v{pkg.version}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem>
            <Link href="/about" className="flex w-full gap-x-2">
              <Book className="w-4" color="#808080" />
              About
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/credits" className="flex w-full gap-x-2">
              <Users className="w-4" color="#808080" />
              Credits
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/contact" className="flex w-full gap-x-2">
              <MailQuestion className="w-4" color="#808080" />
              Contact us
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem>
            <Link
              href="https://discord.com/channels/1207390258275295313/1398561039926296577"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full gap-x-2"
            >
              <svg
                className="w-4 text-amber-500"
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Discord</title>
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
              Discord
            </Link>
          </DropdownMenuItem>
          {process.env.NODE_ENV === "development" ? (
            <>
              <DropdownMenuSeparator className="bg-slate-200" />
              <DropdownMenuItem>
                <Link href="/apps/radio?q=buka" className="flex w-full gap-x-2">
                  <FlaskConical className="w-4" color="#808080" />
                  Experiment
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
