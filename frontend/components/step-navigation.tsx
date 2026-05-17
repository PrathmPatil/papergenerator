"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface StepNavigationProps {
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  isLoading?: boolean;
  hideBack?: boolean;
  hideNext?: boolean;
  className?: string;
}

export function StepNavigation({
  onNext,
  onBack,
  nextLabel = "Next Step",
  backLabel = "Back",
  nextDisabled = false,
  backDisabled = false,
  isLoading = false,
  hideBack = false,
  hideNext = false,
  className = "",
}: StepNavigationProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {!hideBack && (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={backDisabled || isLoading}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      )}
      
      <div className="flex-1" />
      
      {!hideNext && (
        <Button
          onClick={onNext}
          disabled={nextDisabled || isLoading}
          className="gap-2"
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
