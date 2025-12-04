import Link from "next/link";

export default function PageHeaderInfo({
  children,
  moduleName,
  pageDescription,
  isWorkInProgress = false,
}: {
  children?: React.ReactNode;
  moduleName: string;
  pageDescription: string;
  isWorkInProgress?: boolean;
}) {
  return (
    <>
      <div className="text-sm text-muted-foreground">
        <Link href="/" className="underline">
          Home
        </Link>
        {children}
        {moduleName}
      </div>
      <div className="space-y-2">
        <h1 className="mt-5 scroll-m-20 text-3xl font-bold tracking-tight">
          {moduleName}
          {isWorkInProgress && (
            <span className="ml-2 rounded-md bg-[#FFBD7A] px-1.5 py-0.5 align-middle text-xs leading-normal font-normal tracking-tighter">
              work in progress
            </span>
          )}
        </h1>
        <p className="text-base text-muted-foreground">{pageDescription}</p>
      </div>
    </>
  );
}
