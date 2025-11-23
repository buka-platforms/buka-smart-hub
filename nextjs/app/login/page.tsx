import ImageLogo from "@/assets/images/buka-smart-hub-logo.svg";
import { LoginForm } from "@/components/login-form";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md text-primary-foreground">
              <img src={ImageLogo.src} alt="Buka Smart Hub Logo" />
            </div>
            Buka Smart Hub
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src={process.env.NEXT_PUBLIC_LOGIN_PAGE_ARTWORK_IMAGE_URL}
          alt="Artwork illustration"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.7] dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute bottom-0 left-0 z-10 w-max bg-black/40 p-2 text-xs text-white">
          Photo by{" "}
          <a
            href={process.env.NEXT_PUBLIC_LOGIN_PAGE_ARTWORK_ARTIST_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {process.env.NEXT_PUBLIC_LOGIN_PAGE_ARTWORK_ARTIST_NAME}
          </a>{" "}
          on{" "}
          <a
            href={process.env.NEXT_PUBLIC_LOGIN_PAGE_ARTWORK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Unsplash
          </a>
        </div>
      </div>
    </div>
  );
}
