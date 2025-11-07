import React, { useState, useRef } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSelection } from "@/features/customization/customizationSlice";
import {
  addAIPromptMaterialLocal,
  updateMaskStyleLocal,
  setMaskInput,
  setSelectedMaskId,
  addAIPromptMaterial,
  updateMaskStyle,
} from "@/features/masks/maskSlice";
import { uploadInputImage, fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { CustomDialog } from "../ui/CustomDialog";
import { cn } from "@/lib/utils";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { ChevronDown, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CatalogDialogProps {
  open: boolean;
  onClose: () => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();

  const { selections, availableOptions, selectedStyle, inputImageId } =
    useAppSelector((state) => state.customization);

  const { selectedMaskId } = useAppSelector((state) => state.masks);
  const { selectedImageType } = useAppSelector((state) => state.createUI);
  const inputImages = useAppSelector((state) => state.inputImages.images);
  
  // Filter custom uploaded images (user-uploaded images)
  const customImages = inputImages.filter(
    (img) => img.uploadSource === 'CREATE_MODULE' || img.uploadSource === 'GALLERY_UPLOAD'
  );

  const currentData =
    selectedStyle === "photorealistic"
      ? (availableOptions as any)?.photorealistic
      : (availableOptions as any)?.art;

  const [activeCategories, setActiveCategories] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputImagesLoading = useAppSelector((state) => state.inputImages.loading);
  
  const getActiveCategory = (categoryKey: string, categoryData: any): string => {
    if (activeCategories[categoryKey]) {
      return activeCategories[categoryKey];
    }
    if (typeof categoryData === "object" && !Array.isArray(categoryData)) {
      const categories = Object.keys(categoryData);
      return categories[0] || "";
    }
    return "";
  };
  
  const setActiveCategory = (categoryKey: string, subCategory: string) => {
    setActiveCategories(prev => ({ ...prev, [categoryKey]: subCategory }));
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const isCategoryExpanded = (categoryKey: string) => {
    return expandedCategories.has(categoryKey);
  };

  const getSubCategoryInfo = (
    type: string
  ): { id: number; name: string } | undefined => {
    if (!availableOptions) return undefined;

    const styleOptions =
      selectedStyle === "photorealistic"
        ? availableOptions.photorealistic
        : availableOptions.art;

    const subcategoryData = (styleOptions as any)[type];
    if (!subcategoryData) return undefined;

    if (Array.isArray(subcategoryData)) {
      const firstOption = subcategoryData[0];
      if (firstOption?.subCategory?.id) {
        return {
          id: firstOption.subCategory.id,
          name:
            firstOption.subCategory.displayName ||
            type.charAt(0).toUpperCase() + type.slice(1),
        };
      }
      if (firstOption?.category?.id) {
        return {
          id: firstOption.category.id,
          name: type.charAt(0).toUpperCase() + type.slice(1),
        };
      }
      return undefined;
    }

    if (typeof subcategoryData === "object") {
      for (const key in subcategoryData) {
        const arr = subcategoryData[key];
        if (Array.isArray(arr) && arr.length > 0) {
          const firstOption = arr[0];
          if (firstOption?.subCategory?.id) {
            return {
              id: firstOption.subCategory.id,
              name:
                firstOption.subCategory.displayName ||
                type.charAt(0).toUpperCase() + type.slice(1),
            };
          }
          if (firstOption?.category?.id) {
            return {
              id: firstOption.category.id,
              name: type.charAt(0).toUpperCase() + type.slice(1),
            };
          }
        }
      }
    }

    return undefined;
  };

  const isUserUploadedImage = () => {
    if (selectedImageType !== "input" || !inputImageId) return false;
    const currentImage = inputImages.find((img) => img.id === inputImageId);
    return currentImage?.uploadSource === "CREATE_MODULE";
  };

  const handleMaterialSelect = async (
    option: any,
    materialOption: string,
    type: string
  ) => {
    if (selectedMaskId !== null) {
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

      dispatch(
        setMaskInput({
          maskId: selectedMaskId,
          value: { displayName, imageUrl, category },
        })
      );

      if (isUserUploadedImage()) {
        dispatch(
          updateMaskStyle({
            maskId: selectedMaskId,
            materialOptionId,
            customizationOptionId,
            customText: displayName,
            subCategoryId: subCategoryInfo?.id,
          })
        );
      } else {
        dispatch(
          updateMaskStyleLocal({
            maskId: selectedMaskId,
            materialOptionId,
            customizationOptionId,
            customText: displayName,
            subCategoryId: subCategoryInfo?.id,
          })
        );
      }

      dispatch(setSelectedMaskId(null));
      onClose();
    } else if (inputImageId) {
      const displayName = option.displayName || option.name;
      const imageUrl = option.thumbnailUrl || null;

      let materialOptionId: number | undefined;
      let customizationOptionId: number | undefined;

      if (materialOption === "customization") {
        customizationOptionId = option.id;
      } else if (materialOption === "material") {
        materialOptionId = option.id;
      }

      const subCategoryInfo = getSubCategoryInfo(type);

      if (subCategoryInfo) {
        dispatch(
          addAIPromptMaterialLocal({
            inputImageId,
            materialOptionId,
            customizationOptionId,
            subCategoryId: subCategoryInfo.id,
            displayName,
            subCategoryName: subCategoryInfo.name,
            imageUrl,
          })
        );

        if (isUserUploadedImage()) {
          dispatch(
            addAIPromptMaterial({
              inputImageId,
              materialOptionId,
              customizationOptionId,
              subCategoryId: subCategoryInfo.id,
              displayName,
            })
          );
        }
      }
      onClose();
    }
  };

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  if (!currentData) {
    return null;
  }

  const renderCategoryContent = (categoryKey: string, categoryData: any) => {
    // Handle subcategory structure (like walls, floors, context)
    if (typeof categoryData === "object" && !Array.isArray(categoryData)) {
      const categories = Object.keys(categoryData);
      const currentCategory = getActiveCategory(categoryKey, categoryData);

      return (
        <div className="space-y-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {categories.map((catKey) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(categoryKey, catKey)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  currentCategory === catKey
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {catKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {categoryData[currentCategory]?.map((option: any) => {
              const isSelected =
                selections[categoryKey]?.category === currentCategory &&
                selections[categoryKey]?.option === option.id;

              const handleDragStart = (e: React.DragEvent) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  option,
                  materialOption: "material",
                  type: categoryKey
                }));
                e.dataTransfer.effectAllowed = 'copy';
                onClose();
              };

              return (
                <button
                  key={option.id}
                  type="button"
                  draggable
                  onDragStart={handleDragStart}
                  onClick={() => {
                    handleSelectionChange(categoryKey, {
                      category: currentCategory,
                      option: option.id,
                    });
                    handleMaterialSelect(option, "material", categoryKey);
                  }}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
                    isSelected
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  {option.thumbnailUrl && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={option.thumbnailUrl}
                        alt={option.displayName || option.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  <span className="text-xs font-medium text-center text-gray-700 line-clamp-2">
                    {option.displayName || option.name}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <IconCircleCheckFilled size={24} className="text-black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Handle array structure (like type, style, weather, lighting)
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {categoryData.map((option: any) => {
          const isSelected = selections[categoryKey] === option.id;

          const handleDragStart = (e: React.DragEvent) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
              option,
              materialOption: "customization",
              type: categoryKey
            }));
            e.dataTransfer.effectAllowed = 'copy';
            onClose();
          };

          return (
            <button
              key={option.id}
              type="button"
              draggable
              onDragStart={handleDragStart}
              onClick={() => {
                handleSelectionChange(categoryKey, option.id);
                handleMaterialSelect(option, "customization", categoryKey);
              }}
              className={cn(
                "group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:shadow-md cursor-grab active:cursor-grabbing",
                isSelected
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              {option.thumbnailUrl && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={option.thumbnailUrl}
                    alt={option.displayName || option.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}
              <span className="text-xs font-medium text-center text-gray-700 line-clamp-2">
                {option.displayName || option.name}
              </span>
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <IconCircleCheckFilled size={24} className="text-black" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const getCategoryTitle = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderExpandableCategory = (categoryKey: string, categoryTitle: string, categoryData: any) => {
    const isExpanded = isCategoryExpanded(categoryKey);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => toggleCategory(categoryKey)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
            "hover:bg-gray-50 focus:outline-none",
            isExpanded && "bg-gray-50"
          )}
        >
          <h3 className="text-lg font-semibold text-gray-900">{categoryTitle}</h3>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0",
              isExpanded && "transform rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 py-4 border-t border-gray-100">
            {renderCategoryContent(categoryKey, categoryData)}
          </div>
        </div>
      </div>
    );
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        const result = await dispatch(uploadInputImage({ 
          file, 
          uploadSource: 'GALLERY_UPLOAD' 
        }));

        if (uploadInputImage.fulfilled.match(result)) {
          toast.success(`${file.name} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      
      // Refresh the images list
      await dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' }));
      await dispatch(fetchInputImagesBySource({ uploadSource: 'GALLERY_UPLOAD' }));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const renderCustomImagesCategory = () => {
    const isExpanded = isCategoryExpanded("custom_images");

    const handleImageDragStart = (e: React.DragEvent, image: any) => {
      // Set drag data with image URL for texture boxes and mask regions
      e.dataTransfer.setData('application/json', JSON.stringify({
        imageUrl: image.originalUrl || image.imageUrl,
        url: image.originalUrl || image.imageUrl,
        src: image.originalUrl || image.imageUrl,
        type: 'custom_image',
        fileName: image.fileName
      }));
      e.dataTransfer.setData('text/uri-list', image.originalUrl || image.imageUrl);
      e.dataTransfer.setData('text/plain', image.originalUrl || image.imageUrl);
      e.dataTransfer.effectAllowed = 'copy';
      // Close dialog when drag starts
      onClose();
    };

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => toggleCategory("custom_images")}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
            "hover:bg-gray-50 focus:outline-none",
            isExpanded && "bg-gray-50"
          )}
        >
          <h3 className="text-lg font-semibold text-gray-900">Custom Images</h3>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0",
              isExpanded && "transform rotate-180"
            )}
          />
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 py-4 border-t border-gray-100">
            {/* Upload Area */}
            <div
              className={cn(
                "mb-4 rounded-lg border-2 border-dashed transition-colors",
                uploading || inputImagesLoading
                  ? "border-gray-300 bg-gray-50"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleFileDrop}
            >
              <div className="flex flex-col items-center justify-center p-6">
                {uploading || inputImagesLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Drag & drop images here or
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-gray-900 font-medium hover:text-gray-700 underline"
                    >
                      browse files
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload images to reuse in texture boxes and mask regions
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFileUpload(e.target.files);
                  if (e.target) e.target.value = '';
                }}
              />
            </div>

            {/* Images Grid */}
            {customImages.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {customImages.map((image) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, image)}
                    className="group relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={image.thumbnailUrl || image.imageUrl || image.originalUrl}
                        alt={image.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <span className="text-xs font-medium text-center text-gray-700 line-clamp-2">
                      {image.fileName || `Image ${image.id}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              !uploading && !inputImagesLoading && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No custom images yet. Upload images above to get started.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title={`Material Catalog - ${selectedStyle === "photorealistic" ? "Photorealistic" : "Art"}`}
      maxWidth="4xl"
      className="max-h-[90vh]"
    >
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
        <div className="space-y-3">
          {/* Custom Images Category - Always at the top */}
          {renderCustomImagesCategory()}
          
          {/* Material Categories */}
          {selectedStyle === "photorealistic" ? (
            <>
              {renderExpandableCategory("type", "Type", currentData.type)}
              {renderExpandableCategory("walls", "Walls", currentData.walls)}
              {renderExpandableCategory("floors", "Floors", currentData.floors)}
              {renderExpandableCategory("context", "Context", currentData.context)}
              {renderExpandableCategory("style", "Style", currentData.style)}
              {renderExpandableCategory("weather", "Weather", currentData.weather)}
              {renderExpandableCategory("lighting", "Lighting", currentData.lighting)}
            </>
          ) : (
            <>
              {Object.entries(currentData).map(([subcategoryKey, subcategoryData]) => (
                <div key={subcategoryKey}>
                  {renderExpandableCategory(
                    subcategoryKey,
                    getCategoryTitle(subcategoryKey),
                    subcategoryData
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </CustomDialog>
  );
};

export default CatalogDialog;

