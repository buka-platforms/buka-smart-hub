export const widgetCommandDialogContentClass =
  "w-[calc(100vw-1rem)] max-w-2xl border-border bg-popover/95 p-0 text-foreground shadow-2xl backdrop-blur-xl";

export const widgetCommandSearchInputClass =
  "h-9 min-w-52 flex-1 text-sm text-foreground placeholder:text-muted-foreground";

export const widgetCommandSelectTriggerClass =
  "h-9 w-auto max-w-44 min-w-32 cursor-pointer gap-2 border-border bg-muted/50 text-xs text-muted-foreground hover:bg-accent focus:ring-0";

export const widgetCommandSelectContentClass =
  "max-h-72 border-border bg-popover text-foreground";

export const widgetCommandListClass =
  "max-h-[min(70vh,32rem)] overflow-y-auto bg-transparent [&_[cmdk-group-items]]:space-y-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-muted/50";

export const widgetCommandItemClass =
  "group cursor-pointer rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-foreground/10 data-[highlighted=true]:bg-foreground/10 data-[highlighted=true]:text-foreground data-[selected=true]:bg-foreground/10 data-[selected=true]:text-foreground";

export const widgetCommandItemActiveClass = "bg-foreground/10 text-foreground";

export const widgetLogoPlateClass =
  "overflow-hidden rounded-md border border-border bg-gradient-to-br from-background to-muted shadow-sm";
