import { LayersIcon } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import squareSpinner from "@/assets/animations/dotted-spinner-load-black.lottie";
import { useState } from "react";
import VideoTooltip from "@/components/ui/video-tooltip";
import { BaseImageSelectDialog } from "./BaseImageSelectDialog";
import regionsVideo from "@/assets/tooltips/regions.mp4";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setSelectedImage } from "@/features/create/createUISlice";
import { runFluxKonect } from "@/features/tweak/tweakSlice";
import { setMaskGenerationProcessing, setMaskGenerationFailed } from "@/features/masks/maskSlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";
import toast from "react-hot-toast";

interface CreateRegionsButtonProps {
  onClick?: () => void; // Kept for backward compatibility but not used
}

export function CreateRegionsButton({ onClick: _onClick }: CreateRegionsButtonProps) {
  const { loading } = useAppSelector(state => state.masks);
  const dispatch = useAppDispatch();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleClick = () => {
    // Always show the base image selection dialog when clicked
    // The dialog will handle image selection and region generation
    // We ignore the parent onClick handler to always show the dialog
    setIsDialogOpen(true);
  };

  const handleImageSelect = async (imageId: number, imageUrl: string) => {
    try {
      // Set the selected image as the base image
      dispatch(setSelectedImage({ id: imageId, type: 'input' }));

      // Ensure customization slice has the correct inputImageId for RegionsWrapper
      dispatch(loadSettingsFromImage({
        inputImageId: imageId,
        imageId: imageId,
        isGeneratedImage: false,
        settings: {}
      }));

      console.log('🚀 Creating regions with SDXL model:', {
        inputImageId: imageId,
        imageUrl: imageUrl?.substring(0, 50) + '...'
      });

      // Set mask status to 'processing' immediately to show regions panel
      dispatch(setMaskGenerationProcessing({ 
        inputImageId: imageId,
        type: 'region_extraction'
      }));

      // Call SDXL with "extract regions" prompt for regional_prompt task
      const resultResponse: any = await dispatch(
        runFluxKonect({
          prompt: 'extract regions',
          imageUrl: imageUrl,
          variations: 1,
          model: 'sdxl',
          moduleType: 'CREATE',
          selectedBaseImageId: imageId,
          originalBaseImageId: imageId,
          baseAttachmentUrl: imageUrl,
          referenceImageUrls: [],
          textureUrls: undefined,
          surroundingUrls: undefined,
          wallsUrls: undefined,
          size: '1K',
          aspectRatio: '16:9',
        })
      );

      if (resultResponse?.payload?.success) {
        toast.success('Region extraction started');
        setIsDialogOpen(false);
      } else {
        const payload = resultResponse?.payload;
        const errorMsg = payload?.message || payload?.error || 'Region extraction failed';
        toast.error(errorMsg);
        // Reset mask status on failure
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    } catch (error: any) {
      console.error("Error creating regions:", error);
      const errorMsg = error?.message || 'Failed to start region extraction';
      toast.error(errorMsg);
      // Reset mask status on error
      dispatch(setMaskGenerationFailed(errorMsg));
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
          className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-none transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
          type="button"
          onClick={handleClick}
          aria-label="Create Regions"
        >
          {loading ? <DotLottieReact src={squareSpinner} autoplay loop style={{ width: 20, height: 20 }} /> : <LayersIcon size={16} />}
          <span className="font-sans">Create Regions</span>
        </button>
      </VideoTooltip>
      <BaseImageSelectDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onImageSelect={handleImageSelect}
      />
    </>
  );
}

