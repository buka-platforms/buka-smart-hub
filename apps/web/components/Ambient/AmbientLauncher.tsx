"use client";

import AmbientExperience from "@/components/Ambient/AmbientExperience";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ambientScreenStateAtom } from "@/data/store";
import { useSetAtom } from "jotai";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function AmbientLauncher() {
  const [open, setOpen] = useState(false);
  const setAmbientScreenState = useSetAtom(ambientScreenStateAtom);
  const ambientTitle = "Ambient screen";

  useEffect(() => {
    setAmbientScreenState({ isDialogOpen: open });

    return () => {
      setAmbientScreenState({ isDialogOpen: false });
    };
  }, [open, setAmbientScreenState]);

  return (
    <>
      <button
        type="button"
        title={ambientTitle}
        aria-label={ambientTitle}
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <Sparkles className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-dvh w-screen max-w-none gap-0 overflow-hidden border-0 bg-black p-0 text-white shadow-none sm:rounded-none [&>button]:hidden">
          <DialogTitle className="sr-only">Ambient screen</DialogTitle>
          <DialogDescription className="sr-only">
            Full-screen ambient wallpaper with live audio visualization.
          </DialogDescription>
          {open ? (
            <AmbientExperience mode="dialog" onClose={() => setOpen(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
