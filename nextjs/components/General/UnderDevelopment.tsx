import { Button } from "@/components/ui/button";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default function UnderDevelopment({ title }: { title: string }) {
  return (
    <>
      <div className="flex flex-col flex-wrap items-center justify-center gap-y-3 text-center">
        <img
          src="/assets/images/illustration_under_development.svg"
          alt="Under Development"
          className="h-52 w-52 md:h-96 md:w-96"
        />
        <span className="text-sm md:text-base">
          <strong>{title}</strong> feature is under development. Please be
          patient.
        </span>
        <Button className="mt-5 rounded-full text-xs md:text-sm">
          <Link href="/apps">Back</Link>
        </Button>
      </div>
    </>
  );
}
