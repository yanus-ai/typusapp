import { LayersIcon } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import squareSpinner from "@/assets/animations/square-spinner.lottie";
import { useState } from "react";
import VideoTooltip from "@/components/ui/video-tooltip";
import { ColorMapUploadDialog } from "./ColorMapUploadDialog";
import regionsVideo from "@/assets/tooltips/regions.mp4";
import { generateMasks } from "@/features/masks/maskSlice";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useBaseImage } from "../hooks/useBaseImage";
import toast from "react-hot-toast";

export function CreateRegionsButton() {
  const { loading } = useAppSelector(state => state.masks);
  const { baseImageUrl, selectedImageId, selectedImageType } = useBaseImage();
  const historyImages = useAppSelector((state) => state.historyImages.images);
  const dispatch = useAppDispatch();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const getInputImageId = (): number | undefined => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }

    if (selectedImageType === "input") {
      return selectedImageId;
    } else if (selectedImageType === "generated") {
      const generatedImage = historyImages.find(
        (img) => img.id === selectedImageId
      );
      return generatedImage?.originalInputImageId;
    }

    return undefined;
  };

  const handleColorMapSelect = async (_file: File) => {
    if (!baseImageUrl) {
      toast.error("Please select a base image first");
      return;
    }

    const inputImageId = getInputImageId();
    if (!inputImageId) {
      toast.error("Please select a base image first");
      return;
    }

    try {
      // TODO: Upload the color map file first, then generate masks
      // For now, we'll use the base image URL
      await dispatch(generateMasks({
        inputImageId,
        imageUrl: baseImageUrl,
      })).unwrap();
      
      toast.success("Color map uploaded. Processing regions...");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error generating masks:", error);
      toast.error(error || "Failed to process color map");
    }
  };

  return (
    <>
      <VideoTooltip
        className="w-auto"
        containerStyle="w-auto"
        videoSrc={regionsVideo}
        title="Generate Regions"
        description="AI-powered region detection to selectively edit parts of your image"
        direction="top"
      >
        <button
          className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-lg transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
          type="button"
          onClick={handleClick}
          aria-label="Create Regions"
        >
          {loading ? <DotLottieReact src={squareSpinner} autoplay loop style={{ width: 16, height: 16 }} /> : <LayersIcon size={16} />}
          <span className="font-sans">Create Regions</span>
        </button>
      </VideoTooltip>
      <ColorMapUploadDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onColorMapSelect={handleColorMapSelect}
      />
    </>
  );
}

