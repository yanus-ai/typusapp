import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loader from "@/assets/animations/dotted-spinner-load.lottie";
import { useTranslation } from "@/hooks/useTranslation";

export interface GenerateButtonProps extends React.ComponentProps<typeof Button> {
  isGenerating?: boolean;
}

export function GenerateButton({ className, isGenerating, disabled, ...props }: GenerateButtonProps) {
  const { t } = useTranslation();
  
  return (
    <Button
      type="button"
      disabled={disabled || isGenerating}
      className={cn(
        "bg-black text-white hover:bg-black/90 py-5 px-3 font-medium text-sm transition-all duration-200 flex items-center gap-2 rounded-none",
        isGenerating && "!opacity-100 cursor-wait",
        disabled && "!opacity-100 cursor-not-allowed",
        className
      )}
      aria-label={isGenerating ? t('create.generatingAriaLabel') : t('create.generateAriaLabel')}
      {...props}
    >
      {isGenerating ? (
        <>
          <DotLottieReact
            src={loader}
            loop
            autoplay
            style={{ width: 20, height: 20 }}
          />
          <span className="hidden sm:inline">{t('create.generating')}</span>
        </>
      ) : (
        <>
          <SparklesIcon size={16} />
          <span className="hidden sm:inline">{t('create.generate')}</span>
        </>
      )}
    </Button>
  );
}

