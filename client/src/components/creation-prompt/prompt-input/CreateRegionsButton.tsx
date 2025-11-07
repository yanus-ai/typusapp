import { LayersIcon } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { useAppSelector } from "@/hooks/useAppSelector";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import squareSpinner from "@/assets/animations/square-spinner.lottie";

export function CreateRegionsButton() {
  const { loading } = useAppSelector(state => state.masks)
  const handleClick = () => {}

  return (
    <LightTooltip text="Create Regions" direction="bottom">
      <button
        className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-lg transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
        type="button"
        onClick={handleClick}
        aria-label="Create Regions"
      >
        {loading ? <DotLottieReact src={squareSpinner} autoplay loop style={{ width: 16, height: 16 }} /> : <LayersIcon size={16} />}
        <span className="font-sans">Create Regions</span>
      </button>
    </LightTooltip>
  );
}

