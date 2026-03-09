"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PanelLeft } from "lucide-react";
import * as React from "react";

type SidebarContextValue = {
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

const useSidebar = () => {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
};

const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [openMobile, setOpenMobile] = React.useState(false);

  return (
    <SidebarContext.Provider value={{ openMobile, setOpenMobile }}>
      <div className="flex min-h-full w-full">{children}</div>
    </SidebarContext.Provider>
  );
};

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { setOpenMobile } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      className={cn("cursor-pointer md:hidden", className)}
      onClick={() => setOpenMobile(true)}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Open sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const Sidebar = ({
  className,
  children,
}: React.HTMLAttributes<HTMLElement>) => {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <aside
        className={cn(
          "hidden h-full w-72 shrink-0 flex-col border-r bg-slate-50/70 md:flex",
          className,
        )}
      >
        {children}
      </aside>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-[88vw] max-w-80 border-r bg-slate-50 p-0"
        >
          <DialogPrimitive.Title className="sr-only">
            Navigation menu
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Choose an app from the sidebar list.
          </DialogPrimitive.Description>
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const SidebarInset = ({ className, ...props }: React.ComponentProps<"main">) => (
  <main className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />
);

const SidebarHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("border-b p-4", className)} {...props} />
);

const SidebarContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("flex-1 overflow-y-auto p-3", className)} {...props} />
);

const SidebarFooter = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("border-t p-3", className)} {...props} />
);

const SidebarMenu = ({ className, ...props }: React.ComponentProps<"ul">) => (
  <ul className={cn("space-y-1", className)} {...props} />
);

const SidebarMenuItem = ({
  className,
  ...props
}: React.ComponentProps<"li">) => <li className={cn(className)} {...props} />;

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
  }
>(({ asChild = false, isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const { setOpenMobile } = useSidebar();

  return (
    <Comp
      ref={ref}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
        isActive
          ? "bg-slate-900 text-white shadow-xs"
          : "text-slate-700 hover:bg-slate-200",
        className,
      )}
      onClick={() => setOpenMobile(false)}
      {...props}
    />
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarRail = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("hidden w-3 border-r bg-slate-100/70 md:block", className)}
    {...props}
  />
);

export {
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
};

