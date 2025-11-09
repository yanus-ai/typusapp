import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setSelectedMaskId, setMaskInput, updateMaskStyle, updateMaskStyleLocal } from "@/features/masks/maskSlice";
import { useRef } from "react";
import { X } from "lucide-react";

export default function RegionsWrapper() {
  const dispatch = useAppDispatch();
  const { masks, maskInputs, selectedMaskId } = useAppSelector((state) => state.masks);
  const { selectedImageType } = useAppSelector((state) => state.createUI);
  const inputImages = useAppSelector((state) => state.inputImages.images);
  const inputImageId = useAppSelector((state) => state.customization.inputImageId);
  
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Temporary mock masks for testing
  const tempMasks: any[] = [
    {
      id: 1,
      maskUrl: 'https://via.placeholder.com/64x64/4F46E5/FFFFFF?text=Mask+1',
      color: '#4F46E5',
      materialOption: undefined,
      customizationOption: undefined,
      customText: undefined
    },
    {
      id: 2,
      maskUrl: 'https://via.placeholder.com/64x64/10B981/FFFFFF?text=Mask+2',
      color: '#10B981',
      materialOption: undefined,
      customizationOption: undefined,
      customText: undefined
    },
    {
      id: 3,
      maskUrl: 'https://via.placeholder.com/64x64/F59E0B/FFFFFF?text=Mask+3',
      color: '#F59E0B',
      materialOption: undefined,
      customizationOption: undefined,
      customText: undefined
    },
    {
      id: 4,
      maskUrl: 'https://via.placeholder.com/64x64/EF4444/FFFFFF?text=Mask+4',
      color: '#EF4444',
      materialOption: undefined,
      customizationOption: undefined,
      customText: undefined
    }
  ];

  // Use real masks if available, otherwise use temporary ones
  const displayMasks = masks.length > 0 ? masks : tempMasks;

  const isUserUploadedImage = () => {
    if (selectedImageType !== "input" || !inputImageId) return false;
    const currentImage = inputImages.find((img) => img.id === inputImageId);
    return currentImage?.uploadSource === "CREATE_MODULE";
  };

  const handleMaskClick = (maskId: number) => {
    dispatch(setSelectedMaskId(maskId));
    // Focus input after a brief delay to ensure it's rendered
    setTimeout(() => {
      inputRefs.current[maskId]?.focus();
    }, 10);
  };

  const handleInputChange = (maskId: number, value: string) => {
    const currentInput = maskInputs[maskId];
    dispatch(setMaskInput({
      maskId,
      value: {
        displayName: value,
        imageUrl: currentInput?.imageUrl || null,
        category: currentInput?.category || ''
      }
    }));
  };

  const handleInputBlur = (maskId: number) => {
    // Save custom text if there's a value
    const input = maskInputs[maskId];
    if (input?.displayName && input.displayName.trim()) {
      if (isUserUploadedImage()) {
        dispatch(updateMaskStyle({
          maskId,
          customText: input.displayName.trim()
        }));
      } else {
        dispatch(updateMaskStyleLocal({
          maskId,
          customText: input.displayName.trim()
        }));
      }
    }
  };

  const handleDrop = (e: React.DragEvent, maskId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Try to get material data from dataTransfer
      const materialDataStr = e.dataTransfer.getData('application/json');
      if (materialDataStr) {
        const materialData = JSON.parse(materialDataStr);
        
        // Check if it's a custom image (has imageUrl/url/src but no option)
        if (materialData.type === 'custom_image' || (materialData.imageUrl || materialData.url || materialData.src) && !materialData.option) {
          // Handle custom image drop
          const imageUrl = materialData.imageUrl || materialData.url || materialData.src;
          const fileName = materialData.fileName || 'Custom Image';
          
          if (imageUrl) {
            dispatch(setMaskInput({
              maskId,
              value: {
                displayName: fileName,
                imageUrl: imageUrl,
                category: 'custom_image'
              }
            }));
            
            if (isUserUploadedImage()) {
              dispatch(updateMaskStyle({
                maskId,
                customText: fileName,
                materialOptionId: undefined,
                customizationOptionId: undefined,
              }));
            } else {
              dispatch(updateMaskStyleLocal({
                maskId,
                customText: fileName,
                materialOptionId: undefined,
                customizationOptionId: undefined,
              }));
            }
            
            dispatch(setSelectedMaskId(null));
          }
          return;
        }
        
        // Handle material catalog data
        if (materialData.option) {
          applyMaterialToMask(maskId, materialData);
          return;
        }
      }
      
      // Fallback: try to get URL
      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
      if (url && url.startsWith('http')) {
        // Handle direct URL drop (custom image)
        dispatch(setMaskInput({
          maskId,
          value: {
            displayName: 'Custom Image',
            imageUrl: url,
            category: 'custom_image'
          }
        }));
        
        if (isUserUploadedImage()) {
          dispatch(updateMaskStyle({
            maskId,
            customText: 'Custom Image',
            materialOptionId: undefined,
            customizationOptionId: undefined,
          }));
        } else {
          dispatch(updateMaskStyleLocal({
            maskId,
            customText: 'Custom Image',
            materialOptionId: undefined,
            customizationOptionId: undefined,
          }));
        }
        
        dispatch(setSelectedMaskId(null));
        return;
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getSubCategoryInfo = (_type: string): { id: number; name: string } | undefined => {
    // This would need access to availableOptions from Redux
    // For now, we'll skip subCategoryId as it's optional
    return undefined;
  };

  const applyMaterialToMask = (maskId: number, materialData: any) => {
    const { option, materialOption, type } = materialData;
    
    if (!option) return;

    const displayName = `${type} ${option.displayName || option.name}`;
    const imageUrl = option.thumbnailUrl || null;
    const category = type;

    let materialOptionId: number | undefined;
    let customizationOptionId: number | undefined;

    if (materialOption === "customization") {
      customizationOptionId = option.id;
    } else if (materialOption === "material") {
      materialOptionId = option.id;
    }

    const subCategoryInfo = getSubCategoryInfo(type);

    dispatch(setMaskInput({
      maskId,
      value: { displayName, imageUrl, category }
    }));

    if (isUserUploadedImage()) {
      dispatch(updateMaskStyle({
        maskId,
        materialOptionId,
        customizationOptionId,
        customText: displayName,
        subCategoryId: subCategoryInfo?.id,
      }));
    } else {
      dispatch(updateMaskStyleLocal({
        maskId,
        materialOptionId,
        customizationOptionId,
        customText: displayName,
        subCategoryId: subCategoryInfo?.id,
      }));
    }

    dispatch(setSelectedMaskId(null));
  };

  const clearMaterial = (maskId: number) => {
    dispatch(setMaskInput({
      maskId,
      value: { displayName: '', imageUrl: null, category: '' }
    }));
    
    if (isUserUploadedImage()) {
      dispatch(updateMaskStyle({
        maskId,
        customText: '',
        materialOptionId: undefined,
        customizationOptionId: undefined,
      }));
    } else {
      dispatch(updateMaskStyleLocal({
        maskId,
        customText: '',
        materialOptionId: undefined,
        customizationOptionId: undefined,
      }));
    }
  };

  return (
    <div className="relative space-y-3 py-1 w-72">
      <p className="text-xs font-semibold">Picture Regions</p>
      <div className="flex flex-col gap-2 max-h-96 overflow-auto">
        {displayMasks.map((maskRegion) => {
          const maskInput = maskInputs[maskRegion.id];
          const materialImageUrl = maskRegion.materialOption?.thumbnailUrl || 
                                   maskRegion.customizationOption?.thumbnailUrl || 
                                   maskInput?.imageUrl;
          const materialName = maskInput?.displayName || 
                               maskRegion.customText ||
                               maskRegion.materialOption?.displayName ||
                               maskRegion.customizationOption?.displayName ||
                               '';
          const isSelected = selectedMaskId === maskRegion.id;

          return (
            <div
              key={maskRegion.id}
              className="flex items-center gap-2"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, maskRegion.id)}
            >
              {/* Mask Image */}
              <div
                className={`relative flex-shrink-0 w-16 h-16 rounded border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleMaskClick(maskRegion.id)}
              >
                <img
                  src={maskRegion.maskUrl}
                  alt={`Region ${maskRegion.id}`}
                  className="w-full h-full object-cover rounded"
                />
              </div>

              {/* Material Display / Input */}
              <div className="flex-1 min-w-0">
                {materialImageUrl ? (
                  // Show material with image and name when material exists
                  <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded bg-gray-50 min-h-[32px]">
                    <img
                      src={materialImageUrl}
                      alt={materialName}
                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                    />
                    <span className="text-xs text-gray-700 flex-1 truncate capitalize">
                      {materialName.toLowerCase()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearMaterial(maskRegion.id);
                      }}
                      className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      aria-label="Clear material"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  // Always show input field when no material
                  <input
                    ref={(el) => {
                      inputRefs.current[maskRegion.id] = el;
                    }}
                    type="text"
                    value={maskInput?.displayName || ''}
                    onChange={(e) => handleInputChange(maskRegion.id, e.target.value)}
                    onFocus={() => {
                      dispatch(setSelectedMaskId(maskRegion.id));
                    }}
                    onBlur={() => handleInputBlur(maskRegion.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-primary-500 bg-white"
                    placeholder="Type or drag from catalog"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
