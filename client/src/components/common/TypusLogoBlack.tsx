import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export default function TypusLogoBlack({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center p-2.5",
        className
      )}
      {...props}
    >
      <div className="bg-black w-full h-full" />
    </div>
  );
}
