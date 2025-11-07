export function AspectRatioButton() {
  return (
    <button
      data-slot="popover-trigger"
      className="inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5 text-xs"
      type="button"
      id="bits-c56"
      aria-haspopup="dialog"
      aria-expanded="false"
      data-state="closed"
      data-popover-trigger=""
    >
      <div
        className="border-foreground rounded-xs border-[1.5px]"
        style={{ aspectRatio: "16 / 9", width: "14px" }}
      />
      <span className="font-book tracking-wider">16:9</span>
    </button>
  );
}

