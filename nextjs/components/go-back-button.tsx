"use client";

import { useRouter } from "next/navigation";

interface GoBackButtonProps {
  className?: string;
}

export function GoBackButton({ className }: GoBackButtonProps) {
  const router = useRouter();

  return (
    <button onClick={() => router.back()} className={className} type="button">
      Go back to previous page
    </button>
  );
}
