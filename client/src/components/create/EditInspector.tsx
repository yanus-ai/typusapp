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
import { useMaskWebSocket } from '@/hooks/useMaskWebSocket';
import VideoTooltip from '@/components/ui/video-tooltip';
import regionsVideo from '@/assets/tooltips/regions.mp4';

interface EditInspectorProps {
  imageUrl?: string;
  processedUrl?: string;
  inputImageId?: number;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  editInspectorMinimized: boolean;
  setEditInspectorMinimized: (editInspectorMinimized: boolean) => void;
}

const EditInspector: React.FC<EditInspectorProps> = ({ imageUrl, inputImageId, processedUrl, setIsPromptModalOpen, editInspectorMinimized, setEditInspectorMinimized }) => {
  const dispatch = useAppDispatch();

  console.log('🔍 EditInspector props:', {
    imageUrl,
    processedUrl,
    inputImageId,
    editInspectorMinimized
  });

  // WebSocket integration for mask updates
  useMaskWebSocket({
    inputImageId: inputImageId,
    enabled: !!inputImageId
  });

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
        console.log('🎭 Masks already exist, making them visible');
        
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
          console.log('✅ All masks made visible via backend API');
        } else {
          console.log('✅ All masks are already visible');
        }
      } else {
        // Generate new masks if none exist
        console.log('🔍 EditInspector mask generation URLs:', {
          processedUrl,
          imageUrl,
          inputImageId
        });
        
        const maskGenerationImageUrl = processedUrl || imageUrl;
        
        if (!maskGenerationImageUrl) {
          throw new Error('No image URL available for mask generation');
        }
        
        console.log('🚀 Using URL for mask generation:', maskGenerationImageUrl);
        
        await dispatch(generateMasks({
          inputImageId,
          imageUrl: maskGenerationImageUrl,
          callbackUrl: `${import.meta.env.VITE_API_URL}/masks/callback`
        })).unwrap();
        
        console.log('✅ Mask generation initiated successfully');
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
        variant="outline" 
        className="text-xs w-full hover:bg-black hover:text-white group"
        onClick={handleGenerateRegions}
        disabled={!canGenerate || masksLoading}
        title={hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"}
      >
        {masksLoading || maskStatus === 'processing' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-[1px] group-hover:border-white border-black border-t-transparent" />
        ) : (
          <Layers2 className="h-3 w-3" />
        )}
        {/* {hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"} */}
        <span>
          {/* {hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"} */}
          Generate Regions
        </span>
      </Button>
    );
  };

  return (
    <div className={`shadow-lg h-full bg-gray-100 w-[322px] flex flex-col rounded-md custom-scrollbar transition-all ${editInspectorMinimized ? 'translate-y-[calc(100vh-122px)] absolute left-[100px]' : 'translate-y-0'}`}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center cursor-pointer" onClick={() => setEditInspectorMinimized(!editInspectorMinimized)}>
        <h2 className="font-medium">Edit Inspector</h2>
        <Button variant="ghost" size="icon">
          {
            editInspectorMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1 my-2">
        {/* Image Preview */}
        <div className="p-4">
          <div className="relative rounded-md overflow-hidden h-[170px] w-[274px] bg-gray-200">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Current preview" 
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
            containerWidth='w-full'
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
          <div className="flex mb-4 bg-[#EFECEC] rounded-xl">
            <Button 
              className={`w-1/2 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                selectedStyle === 'photorealistic' 
                  ? 'bg-black text-white hover:bg-black hover:text-white' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
              onClick={() => dispatch(setSelectedStyle('photorealistic'))}
            >
              <ImageIcon size={18} />
              Photorealistic
            </Button>
            <Button
              className={`w-1/2 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                selectedStyle === 'art' 
                  ? 'bg-black text-white hover:bg-black hover:text-white' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
              onClick={() => dispatch(setSelectedStyle('art'))}
            >
              <Palette size={18} />
              Art
            </Button>
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