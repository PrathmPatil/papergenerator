"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DialogVariant = "default" | "destructive";

type DialogOptions = {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
};

type ActiveDialog = DialogOptions & {
  type: "info" | "confirm";
  resolve: (value: boolean) => void;
};

type DialogHandler = (dialog: ActiveDialog) => void;

let dialogHandler: DialogHandler | null = null;

const normalizeOptions = (options: string | DialogOptions): DialogOptions =>
  typeof options === "string" ? { description: options } : options;

export const showInfo = (options: string | DialogOptions) =>
  new Promise<void>((resolve) => {
    const normalizedOptions = normalizeOptions(options);

    if (!dialogHandler) {
      resolve();
      return;
    }

    dialogHandler({
      title: normalizedOptions.title || "Information",
      confirmText: normalizedOptions.confirmText || "OK",
      variant: normalizedOptions.variant || "default",
      ...normalizedOptions,
      type: "info",
      resolve: () => resolve(),
    });
  });

export const showConfirm = (options: string | DialogOptions) =>
  new Promise<boolean>((resolve) => {
    const normalizedOptions = normalizeOptions(options);

    if (!dialogHandler) {
      resolve(false);
      return;
    }

    dialogHandler({
      title: normalizedOptions.title || "Confirm action",
      confirmText: normalizedOptions.confirmText || "Continue",
      cancelText: normalizedOptions.cancelText || "Cancel",
      variant: normalizedOptions.variant || "default",
      ...normalizedOptions,
      type: "confirm",
      resolve,
    });
  });

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);

  useEffect(() => {
    dialogHandler = setActiveDialog;
    return () => {
      dialogHandler = null;
    };
  }, []);

  const closeDialog = (value: boolean) => {
    activeDialog?.resolve(value);
    setActiveDialog(null);
  };

  return (
    <>
      {children}
      <AlertDialog open={Boolean(activeDialog)} onOpenChange={(open) => !open && closeDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{activeDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {activeDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {activeDialog?.type === "confirm" && (
              <AlertDialogCancel onClick={() => closeDialog(false)}>
                {activeDialog.cancelText || "Cancel"}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              className={
                activeDialog?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => closeDialog(true)}
            >
              {activeDialog?.confirmText || "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
