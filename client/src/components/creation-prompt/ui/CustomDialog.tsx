import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
}

export function CustomDialog({
  open,
  onClose,
  title,
  children,
  className,
  maxWidth = "2xl",
}: CustomDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setIsVisible(true);
      // Trigger animation after mount
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = "";
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!isVisible) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
      >
        <div
          className={cn(
            "relative w-full bg-white rounded-xl shadow-2xl border border-gray-200",
            "transform transition-all duration-200 ease-out pointer-events-auto",
            isAnimating
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4",
            maxWidthClasses[maxWidth],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2
                id="dialog-title"
                className="text-base font-semibold text-gray-900"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="ml-4 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className={cn("overflow-auto", title ? "px-6 py-4" : "p-6")}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

