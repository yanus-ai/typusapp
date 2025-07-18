import React, { useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { SquarePen, ImageIcon, ChevronRight, Layers2, MinusIcon, Palette } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  setSelectedStyle,
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
  setSelection,
  toggleSection,
  fetchCustomizationOptions
} from '@/features/customization/customizationSlice';
import { 
  generateMasks, 
  getMasks, 
  // selectMask, 
  // updateMaskStyle,
  // clearSelection,
  resetMaskState 
} from '@/features/masks/maskSlice';
import CategorySelector from './CategorySelector';
import SubCategorySelector from './SubcategorySelector';
import SliderSection from './SliderSection';
import ExpandableSection from './ExpandableSection';
import { useWebSocket } from '@/hooks/useWebSocket';

interface EditInspectorProps {
  imageUrl?: string;
  inputImageId?: number;
  setIsPromptModalOpen: (isOpen: boolean) => void;
}

const EditInspector: React.FC<EditInspectorProps> = ({ imageUrl, inputImageId, setIsPromptModalOpen }) => {
  const dispatch = useAppDispatch();

  // Memoize the WebSocket message handler to prevent recreations
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('📨 WebSocket message received:', message.type);
    
    switch (message.type) {
      case 'connected':
        console.log('✅ WebSocket connected');
        break;
        
      case 'subscribed':
        console.log('📺 Subscribed to updates for image:', message.inputImageId);
        break;
        
      case 'masks_completed':
        if (message.inputImageId === inputImageId && inputImageId) {
          console.log('✅ Masks completed! Refreshing masks for image:', inputImageId);
          dispatch(getMasks(inputImageId));
        }
        break;
        
      case 'masks_failed':
        if (message.inputImageId === inputImageId) {
          console.log('❌ Masks failed:', message.error);
          // Handle error state if needed
        }
        break;
        
      default:
        // Don't log unknown messages to reduce console noise
        break;
    }
  }, [inputImageId, dispatch]);

  // Memoize WebSocket options to prevent recreation
  const webSocketOptions = useMemo(() => ({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('🔗 WebSocket connection established');
    },
    onDisconnect: () => {
      console.log('🔌 WebSocket disconnected');
    },
    onError: (error: Event) => {
      console.error('❌ WebSocket error:', error);
    },
    reconnectAttempts: 3,
    reconnectInterval: 5000
  }), [handleWebSocketMessage]);

  // WebSocket connection
  const { sendMessage, isConnected } = useWebSocket(
    import.meta.env.VITE_WEBSOCKET_URL,
    webSocketOptions
  );

  // Subscription management with cleanup
  useEffect(() => {
    if (!inputImageId || !isConnected) return;

    console.log('📺 Subscribing to mask updates for image:', inputImageId);
    
    const subscribed = sendMessage({
      type: 'subscribe_masks',
      inputImageId
    });

    if (subscribed) {
      // Return cleanup function
      return () => {
        console.log('📺 Unsubscribing from mask updates for image:', inputImageId);
        sendMessage({
          type: 'unsubscribe_masks',
          inputImageId
        });
      };
    }
  }, [inputImageId, isConnected, sendMessage]);

  // Redux selectors
  const {
    selectedStyle,
    variations,
    creativity,
    expressivity,
    resemblance,
    selections,
    expandedSections,
    availableOptions,
    optionsLoading
  } = useAppSelector(state => state.customization);

  const {
    masks,
    maskStatus,
    loading: masksLoading,
  } = useAppSelector(state => state.masks);

  // Get the current expanded sections based on selected style
  const currentExpandedSections: Record<string, boolean> = expandedSections[selectedStyle] as unknown as Record<string, boolean>;
  
  const [minimized, setMinimized] = React.useState(false);

  // Load customization options on mount
  useEffect(() => {
    if (!availableOptions) {
      dispatch(fetchCustomizationOptions());
    }
  }, [dispatch, availableOptions]);

  // Load masks when inputImageId changes
  useEffect(() => {
    if (inputImageId) {
      dispatch(getMasks(inputImageId));
    } else {
      dispatch(resetMaskState());
    }
  }, [dispatch, inputImageId]);

  const handleStyleChange = (style: 'photorealistic' | 'art') => {
    dispatch(setSelectedStyle(style));
  };

  const handleVariationsChange = (num: number) => {
    dispatch(setVariations(num));
  };

  const handleSliderChange = (type: string, value: number) => {
    switch (type) {
      case 'creativity':
        dispatch(setCreativity(value));
        break;
      case 'expressivity':
        dispatch(setExpressivity(value));
        break;
      case 'resemblance':
        dispatch(setResemblance(value));
        break;
    }
  };

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleSectionToggle = (section: string) => {
    dispatch(toggleSection(section));
  };

  // Mask-related handlers
  const handleGenerateRegions = async () => {
    if (!inputImageId || !imageUrl) {
      console.error('Missing inputImageId or imageUrl for mask generation');
      return;
    }

    try {
      setIsPromptModalOpen(true);
      // Use the processed image URL for mask generation
      await dispatch(generateMasks({
        inputImageId,
        imageUrl, // This should be the processedUrl from the input image
        callbackUrl: `${import.meta.env.VITE_API_URL}/masks/callback`
      })).unwrap();
      
      console.log('✅ Mask generation initiated successfully');
    } catch (error) {
      console.error('❌ Failed to generate masks:', error);
    }
  };

  // Helper function to render the Generate Regions button
  const renderGenerateRegionsButton = () => {
    const canGenerate = inputImageId && imageUrl && maskStatus !== 'processing';
    const hasExistingMasks = maskStatus === 'completed' && masks.length > 0;
    
    return (
      <Button 
        size="icon" 
        variant="secondary" 
        className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg"
        onClick={handleGenerateRegions}
        disabled={!canGenerate || masksLoading}
        title={hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"}
      >
        {masksLoading || maskStatus === 'processing' ? (
          <div className="h-3 w-3 animate-spin rounded-full border-[1px] border-white border-t-transparent" />
        ) : (
          <Layers2 className="h-3 w-3" />
        )}
      </Button>
    );
  };

  if (minimized) {
    return (
      <div className="h-full bg-gray-100 border-r border-gray-200 w-12 flex flex-col items-center py-4 rounded-md">
        <Button variant="ghost" size="icon" onClick={() => setMinimized(false)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (optionsLoading) {
    return (
      <div className="h-full bg-gray-100 border-r border-gray-200 min-w-[321px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
      </div>
    );
  }

  const currentData = selectedStyle === 'photorealistic' 
    ? availableOptions?.photorealistic 
    : availableOptions?.art;

  return (
    <div className="h-full bg-gray-100 border-r border-gray-200 w-[322px] flex flex-col rounded-md custom-scrollbar">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-medium">Edit Inspector</h2>
        <Button variant="ghost" size="icon" onClick={() => setMinimized(true)}>
          <MinusIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1">
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
              {renderGenerateRegionsButton()}
              <Button size="icon" variant="secondary" className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg">
                <SquarePen className="h-3 w-3" />
              </Button>
            </div>
          </div>
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
              onClick={() => handleStyleChange('photorealistic')}
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
              onClick={() => handleStyleChange('art')}
            >
              <Palette size={18} />
              Art
            </Button>
          </div>
        </div>
        
        {/* Number of Variations */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Number of Variations</h3>
          <div className="flex mb-4 bg-[#EFECEC] rounded-xl">
            {[1, 2, 3, 4].map((num) => (
              <Button 
                key={num}
                className={`flex-1 py-1.5 px-2 rounded-xl ${
                  variations === num 
                    ? 'bg-white text-black hover:bg-white hover:text-black' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
                }`}
                onClick={() => handleVariationsChange(num)}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Sliders */}
        <SliderSection 
          title="Creativity" 
          value={creativity} 
          onChange={(value) => handleSliderChange('creativity', value)} 
        />
        <SliderSection 
          title="Expressivity" 
          value={expressivity} 
          onChange={(value) => handleSliderChange('expressivity', value)} 
        />
        <SliderSection 
          title="Resemblance" 
          value={resemblance} 
          onChange={(value) => handleSliderChange('resemblance', value)} 
        />
        
        {/* Conditional Content Based on Style */}
        {selectedStyle === 'photorealistic' && currentData && currentExpandedSections ? (
          <>
            {/* Type Section */}
            <ExpandableSection 
              title="Type" 
              expanded={currentExpandedSections.type} 
              onToggle={() => handleSectionToggle('type')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.type?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    selected={selections.type === option.id}
                    onSelect={() => handleSelectionChange('type', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Walls Section */}
            <ExpandableSection 
              title="Walls" 
              expanded={currentExpandedSections.walls} 
              onToggle={() => handleSectionToggle('walls')} 
            >
              <SubCategorySelector
                data={currentData.walls}
                selectedCategory={selections.walls?.category}
                selectedOption={selections.walls?.option}
                onSelectionChange={(category, option) => 
                  handleSelectionChange('walls', { category, option })
                }
              />
            </ExpandableSection>
            
            {/* Floors Section */}
            <ExpandableSection 
              title="Floors" 
              expanded={currentExpandedSections.floors} 
              onToggle={() => handleSectionToggle('floors')} 
            >
              <SubCategorySelector
                data={currentData.floors}
                selectedCategory={selections.floors?.category}
                selectedOption={selections.floors?.option}
                onSelectionChange={(category, option) => 
                  handleSelectionChange('floors', { category, option })
                }
              />
            </ExpandableSection>
            
            {/* Context Section */}
            <ExpandableSection 
              title="Context" 
              expanded={currentExpandedSections.context} 
              onToggle={() => handleSectionToggle('context')} 
            >
              <SubCategorySelector
                data={currentData.context}
                selectedCategory={selections.context?.category}
                selectedOption={selections.context?.option}
                onSelectionChange={(category, option) => 
                  handleSelectionChange('context', { category, option })
                }
              />
            </ExpandableSection>
            
            {/* Style Section */}
            <ExpandableSection 
              title="Style" 
              expanded={currentExpandedSections.style} 
              onToggle={() => handleSectionToggle('style')} 
            >
              <div className="grid grid-cols-3 gap-2 pb-4">
                {currentData.style?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.displayName}
                    imageUrl={option.thumbnailUrl}
                    selected={selections.style === option.id}
                    onSelect={() => handleSelectionChange('style', option.id)}
                    showImage={true}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Weather Section */}
            <ExpandableSection 
              title="Weather" 
              expanded={currentExpandedSections.weather} 
              onToggle={() => handleSectionToggle('weather')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.weather?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    selected={selections.weather === option.id}
                    onSelect={() => handleSelectionChange('weather', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
            
            {/* Lighting Section */}
            <ExpandableSection 
              title="Lighting" 
              expanded={currentExpandedSections.lighting} 
              onToggle={() => handleSectionToggle('lighting')} 
            >
              <div className="grid grid-cols-2 gap-2 pb-4">
                {currentData.lighting?.map((option: any) => (
                  <CategorySelector
                    key={option.id}
                    title={option.name}
                    selected={selections.lighting === option.id}
                    onSelect={() => handleSelectionChange('lighting', option.id)}
                    showImage={false}
                    className="aspect-auto"
                  />
                ))}
              </div>
            </ExpandableSection>
          </>
        ) : selectedStyle === 'art' && currentData && currentExpandedSections ? (
          <>
            {/* Art Style Selection with Subcategories */}
            {Object.entries(currentData).map(([subcategoryKey, options]) => (
              <ExpandableSection 
                key={subcategoryKey}
                title={subcategoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                expanded={currentExpandedSections[subcategoryKey]} 
                onToggle={() => handleSectionToggle(subcategoryKey)} 
              >
                <div className="grid grid-cols-3 gap-2 pb-4">
                  {(options as any[]).map((option: any) => (
                    <CategorySelector
                      key={option.id}
                      title={option.displayName}
                      selected={selections[subcategoryKey] === option.id}
                      onSelect={() => handleSelectionChange(subcategoryKey, option.id)}
                      showImage={option.thumbnailUrl ? true : false}
                      imageUrl={option.thumbnailUrl}
                      className="aspect-auto"
                    />
                  ))}
                </div>
              </ExpandableSection>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default EditInspector;