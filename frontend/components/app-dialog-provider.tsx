"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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

type DeleteConfirmOptions = {
  title?: string;
  description?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
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

/** Shared destructive delete confirmation used across the app. */
export const showDeleteConfirm = (options: string | DeleteConfirmOptions = {}) => {
  const normalized =
    typeof options === "string"
      ? { description: options }
      : options;

  const itemLabel = normalized.itemName ? ` "${normalized.itemName}"` : "";
  const description =
    normalized.description ||
    `Are you sure you want to delete${itemLabel}? This action cannot be undone.`;

  return showConfirm({
    title: normalized.title || "Delete?",
    description,
    confirmText: normalized.confirmText || "Delete",
    cancelText: normalized.cancelText || "Cancel",
    variant: "destructive",
  });
};

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

  const isDestructive = activeDialog?.variant === "destructive";
  const isConfirm = activeDialog?.type === "confirm";

  return (
    <>
      {children}
      <AlertDialog
        open={Boolean(activeDialog)}
        onOpenChange={(open) => !open && closeDialog(false)}
      >
        <AlertDialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
          <AlertDialogHeader className="sm:text-left">
            <div className="flex items-start gap-3">
              {isConfirm && isDestructive ? (
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Trash2 className="h-5 w-5" />
                </div>
              ) : isConfirm ? (
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <AlertDialogTitle>{activeDialog?.title}</AlertDialogTitle>
                <AlertDialogDescription className="max-h-[60vh] overflow-y-auto whitespace-pre-line pr-1">
                  {activeDialog?.description}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isConfirm && (
              <AlertDialogCancel onClick={() => closeDialog(false)}>
                {activeDialog?.cancelText || "Cancel"}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              className={
                isDestructive
                  ? "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
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
