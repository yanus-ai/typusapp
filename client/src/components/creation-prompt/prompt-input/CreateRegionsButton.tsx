import { LayersIcon } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import squareSpinner from "@/assets/animations/dotted-spinner-load-black.lottie";
import { useState } from "react";
import VideoTooltip from "@/components/ui/video-tooltip";
import { BaseImageSelectDialog } from "./BaseImageSelectDialog";
import regionsVideo from "@/assets/tooltips/regions.mp4";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { generateMasks, getMasks, setMaskGenerationFailed } from "@/features/masks/maskSlice";
import toast from "react-hot-toast";
import { setSelectedImage, setIsCatalogOpen } from "@/features/create/createUISlice";
import { loadSettingsFromImage } from "@/features/customization/customizationSlice";

export function CreateRegionsButton() {
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
      // // Set the selected image as the base image
      dispatch(setSelectedImage({ id: imageId, type: 'input' }));

      // Ensure customization slice has the correct inputImageId for RegionsWrapper
      dispatch(loadSettingsFromImage({
        inputImageId: imageId,
        imageId: imageId,
        isGeneratedImage: false,
        settings: {}
      }));

      console.log('🚀 Calling FastAPI color filter for region extraction', {
        inputImageId: imageId,
        imageUrl: imageUrl?.substring(0, 50) + '...'
      });

      // Call FastAPI color filter service to generate multiple black & white mask regions
      const resultResponse: any = await dispatch(
        generateMasks({
          imageUrl: imageUrl,
          inputImageId: imageId
        })
      );

      if (resultResponse?.payload?.success || resultResponse?.type?.endsWith('/fulfilled')) {
        const payload = resultResponse?.payload?.data;
        const message = resultResponse?.payload?.message || '';
        
        // If masks already exist or are returned synchronously, they're already populated by generateMasks.fulfilled
        // But we should also call getMasks to ensure we have the latest data with all relations
        if (payload?.maskRegions && payload.maskRegions.length > 0) {
          // Masks are already in Redux from generateMasks.fulfilled, but refresh to get full relations
          await dispatch(getMasks(imageId));
          dispatch(setIsCatalogOpen(true));
          toast.success('Regions loaded');
        } else if (message.includes('already exist')) {
          // Masks exist but weren't in response - fetch them
          await dispatch(getMasks(imageId));
          dispatch(setIsCatalogOpen(true));
          toast.success('Regions loaded');
        } else {
          // New generation started - will be completed via WebSocket
          toast.success('Region extraction started');
        }
        setIsDialogOpen(false);
      } else {
        const payload = resultResponse?.payload;
        const errorMsg = payload?.message || payload?.error || 'Region extraction failed';
        console.error('❌ FastAPI mask generation failed:', errorMsg, payload);
        toast.error(errorMsg);
        // Reset mask status on failure
        dispatch(setMaskGenerationFailed(errorMsg));
      }
    } catch (error: any) {
      console.error('❌ Create Regions error:', error);
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

