"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: "پخش و ناوبری",
    shortcuts: [
      { keys: ["Space"], description: "پخش / توقف" },
      { keys: ["Home"], description: "رفتن به ابتدا" },
      { keys: ["End"], description: "رفتن به انتها" },
      { keys: ["←", "→"], description: "حرکت فریم به فریم" },
    ],
  },
  {
    title: "ویرایش",
    shortcuts: [
      { keys: ["Delete"], description: "حذف کلیپ انتخابی" },
      { keys: ["Ctrl", "C"], description: "کپی" },
      { keys: ["Ctrl", "V"], description: "چسباندن" },
      { keys: ["Ctrl", "Z"], description: "بازگشت" },
    ],
  },
  {
    title: "نمایش",
    shortcuts: [
      { keys: ["+"], description: "بزرگنمایی" },
      { keys: ["-"], description: "کوچکنمایی" },
      { keys: ["Shift", "?"], description: "نمایش میانبرها" },
    ],
  },
];

interface KeyboardShortcutsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            میانبرهای کیبورد
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
        title="میانبرهای کیبورد (Shift + ?)"
      >
        <Keyboard className="w-4 h-4" />
      </Button>
      <KeyboardShortcuts open={open} onOpenChange={setOpen} />
    </>
  );
}
