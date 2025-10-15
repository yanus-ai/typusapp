import React from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ImageIcon, ChevronDown, Layers2, Palette, ChevronUp } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { 
  generateMasks,
  updateMaskVisibility
} from '@/features/masks/maskSlice';
import {
  setSelectedStyle,
} from '@/features/customization/customizationSlice';
import SettingsControls from './SettingsControls';
import MaterialCustomizationSettings from './MaterialCustomizationSettings';
import VideoTooltip from '@/components/ui/video-tooltip';
import regionsVideo from '@/assets/tooltips/regions.mp4';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';

interface EditInspectorProps {
  imageUrl?: string;
  processedUrl?: string;
  previewUrl?: string;
  inputImageId?: number;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  editInspectorMinimized: boolean;
  setEditInspectorMinimized: (editInspectorMinimized: boolean) => void;
}

const EditInspector: React.FC<EditInspectorProps> = ({ imageUrl, inputImageId, processedUrl, previewUrl, setIsPromptModalOpen, editInspectorMinimized, setEditInspectorMinimized }) => {
  const dispatch = useAppDispatch();

  // Generation state from Redux
  const isGenerating = useAppSelector(state => state.createUI.isGenerating);
  const generatingInputImageId = useAppSelector(state => state.createUI.generatingInputImageId);
  const generatingInputImagePreviewUrl = useAppSelector(state => state.createUI.generatingInputImagePreviewUrl);

  // Determine effective preview URL - show original input image during generation
  const isCurrentImageGenerating = isGenerating && inputImageId === generatingInputImageId;
  const effectivePreviewUrl = isCurrentImageGenerating && generatingInputImagePreviewUrl
    ? generatingInputImagePreviewUrl
    : (previewUrl || imageUrl);


  // WebSocket integration handled by parent page's useUnifiedWebSocket

  // Redux selectors
  const {
    selectedStyle
  } = useAppSelector(state => state.customization);

  const {
    masks,
    maskStatus,
    loading: masksLoading
  } = useAppSelector(state => state.masks);



  // Mask-related handlers
  const handleGenerateRegions = async () => {
    if (!inputImageId || !imageUrl) {
      console.error('Missing inputImageId or imageUrl for mask generation');
      return;
    }

    const hasExistingMasks = maskStatus === 'completed' && masks.length > 0;

    try {
      setIsPromptModalOpen(true);
      
      if (hasExistingMasks) {
        // If masks already exist, make them visible instead of generating new ones
        
        // Make all masks visible using backend API
        const visibilityUpdatePromises = masks
          .filter(mask => !mask.isVisible)
          .map(mask => 
            dispatch(updateMaskVisibility({
              maskId: mask.id,
              isVisible: true
            })).unwrap()
          );

        if (visibilityUpdatePromises.length > 0) {
          await Promise.all(visibilityUpdatePromises);
        } else { /* empty */ }
      } else {

        
        const maskGenerationImageUrl = processedUrl || imageUrl;
        
        if (!maskGenerationImageUrl) {
          throw new Error('No image URL available for mask generation');
        }
        
        
        await dispatch(generateMasks({
          inputImageId,
          imageUrl: maskGenerationImageUrl,
          callbackUrl: `${import.meta.env.VITE_API_URL}/masks/callback`
        })).unwrap();
        
      }
    } catch (error) {
      console.error('❌ Failed to handle mask regions:', error);
    }
  };

  // Helper function to render the Generate Regions button
  const renderGenerateRegionsButton = () => {
    const canGenerate = imageUrl && maskStatus !== 'processing';
    const hasExistingMasks = maskStatus === 'completed' && masks.length > 0;

    return (
      <Button 
        variant={'ghost'}
        className="text-xs w-full bg-white cursor-pointer shadow-sm hover:shaddow-md"
        onClick={handleGenerateRegions}
        disabled={!canGenerate || masksLoading}
        title={hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"}
      >
        {masksLoading || maskStatus === 'processing' ? (
          <DotLottieReact
            src={squareSpinner}
            autoplay
            loop
            style={{ width: 16, height: 16 }}
          />
        ) : (
          <Layers2 className="h-4 w-4" />
        )}
        <span>
          Generate Regions
        </span>
      </Button>
    );
  };

  return (
    <div className={`h-full bg-site-white w-[322px] flex flex-col rounded-md custom-scrollbar transition-all z-100 ${editInspectorMinimized ? 'translate-y-[calc(100vh-122px)] absolute left-[100px]' : 'translate-y-0'}`}>
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setEditInspectorMinimized(!editInspectorMinimized)}>
        <h2 className="font-medium">Edit Inspector</h2>
        <Button variant="ghost" size="icon">
          {
            editInspectorMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1 my-2">
        {/* Image Preview - Always show base image */}
        <div className="p-4">
          <div className="relative rounded-md overflow-hidden h-[170px] w-[274px] bg-gray-200">
            {effectivePreviewUrl ? (
              <img
                src={effectivePreviewUrl}
                alt="Base image preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-300 select-none">
                <span className="text-gray-500">No Image</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button size="icon" variant="secondary" className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg">
                <SquarePen className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className='px-4 pb-4 w-full'>
          <VideoTooltip 
            className='w-full'
            containerStyle='w-full'
            videoSrc={regionsVideo}
            title="Generate Regions"
            description="AI-powered region detection to selectively edit parts of your image"
            direction="bottom"
          >
            {renderGenerateRegionsButton()}
          </VideoTooltip>
        </div>

        
        {/* Style Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Settings</h3>
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                selectedStyle === 'photorealistic'
                  ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg'
                  : 'text-gray-500 hover:text-black'
              }`}
              onClick={() => dispatch(setSelectedStyle('photorealistic'))}
            >
              <ImageIcon size={18} />
              Photorealistic
            </button>
            <button
              className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                selectedStyle === 'art'
                  ? 'text-red-500 border border-red-200 bg-red-50 shadow-lg'
                  : 'text-gray-500 hover:text-black'
              }`}
              onClick={() => dispatch(setSelectedStyle('art'))}
            >
              <Palette size={18} />
              Art
            </button>
          </div>
        </div>
        
        <SettingsControls />
        
        <MaterialCustomizationSettings
          selectedStyle={selectedStyle}
          inputImageId={inputImageId}
        />
      </div>
    </div>
  );
};

export default EditInspector;