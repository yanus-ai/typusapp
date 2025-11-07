import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GenerateButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      className={cn("bg-black text-white hover:bg-black/90 py-5 px-3 font-medium text-sm", className)}
      aria-label="Generate"
      {...props}
    >
      <SparklesIcon size={16} />
      <span className="hidden sm:inline">Generate</span>
    </Button>
  );
}

