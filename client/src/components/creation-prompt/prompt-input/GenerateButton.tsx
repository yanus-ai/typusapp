import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import squareSpinner from "@/assets/animations/square-spinner.lottie";

export interface GenerateButtonProps extends React.ComponentProps<typeof Button> {
  isGenerating?: boolean;
}

export function GenerateButton({ className, isGenerating, disabled, ...props }: GenerateButtonProps) {
  return (
    <Button
      type="button"
      disabled={disabled || isGenerating}
      className={cn(
        "bg-black text-white hover:bg-black/90 py-5 px-3 font-medium text-sm transition-all duration-200 flex items-center gap-2",
        isGenerating && "opacity-90 cursor-wait",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={isGenerating ? "Generating" : "Generate"}
      {...props}
    >
      {isGenerating ? (
        <>
          <DotLottieReact
            src={squareSpinner}
            loop
            autoplay
            style={{ width: 16, height: 16 }}
          />
          <span className="hidden sm:inline">Generating</span>
        </>
      ) : (
        <>
          <SparklesIcon size={16} />
          <span className="hidden sm:inline">Generate</span>
        </>
      )}
    </Button>
  );
}

