import React, { useState, useEffect, useRef } from "react";
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
import {
  uploadInputImage,
  fetchInputImagesBySource,
} from "@/features/images/inputImagesSlice";
import CategorySelectorCompact from "./CategorySelectorCompact";
import SubCategorySelectorCompact from "./SubcategorySelectorCompact";
import ExpandableSectionCompact from "./ExpandableSectionCompact";
import CatalogDialog from "./CatalogDialog";
import { Grid3x3, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const MaterialCustomizationSettingsCompact: React.FC = () => {
  const dispatch = useAppDispatch();

  const { selections, availableOptions, selectedStyle, inputImageId } =
    useAppSelector((state) => state.customization);

  const { selectedMaskId } = useAppSelector((state) => state.masks);
  const { selectedImageType } = useAppSelector((state) => state.createUI);
  const inputImages = useAppSelector((state) => state.inputImages.images);
  const inputImagesLoading = useAppSelector(
    (state) => state.inputImages.loading
  );

  // Filter custom uploaded images (user-uploaded images)
  const customImages = inputImages.filter(
    (img) =>
      img.uploadSource === "CREATE_MODULE" ||
      img.uploadSource === "GALLERY_UPLOAD"
  );

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentData =
    selectedStyle === "photorealistic"
      ? (availableOptions as any)?.photorealistic
      : (availableOptions as any)?.art;

  // Accordion state - only one section open at a time
  const getInitialSections = () => {
    if (selectedStyle === "photorealistic") {
      return [
        "type",
        "walls",
        "floors",
        "context",
        "style",
        "weather",
        "lighting",
      ];
    } else {
      return Object.keys(currentData || {});
    }
  };

  const sections = getInitialSections();
  const [expandedSection, setExpandedSection] = useState<string | null>(
    sections.length > 0 ? sections[0] : null
  );
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Reset expanded section when style changes
  useEffect(() => {
    const newSections = getInitialSections();
    if (
      newSections.length > 0 &&
      !newSections.includes(expandedSection || "")
    ) {
      setExpandedSection(newSections[0]);
    }
  }, [selectedStyle]);

  const handleSelectionChange = (category: string, value: any) => {
    dispatch(setSelection({ category, value }));
  };

  const handleSectionToggle = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        const result = await dispatch(
          uploadInputImage({
            file,
            uploadSource: "GALLERY_UPLOAD",
          })
        );

        if (uploadInputImage.fulfilled.match(result)) {
          toast.success(`${file.name} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      // Refresh the images list
      await dispatch(
        fetchInputImagesBySource({ uploadSource: "CREATE_MODULE" })
      );
      await dispatch(
        fetchInputImagesBySource({ uploadSource: "GALLERY_UPLOAD" })
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred while uploading");
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

  const handleImageDragStart = (e: React.DragEvent, image: any) => {
    // Set drag data with image URL for texture boxes and mask regions
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        imageUrl: image.originalUrl || image.imageUrl,
        url: image.originalUrl || image.imageUrl,
        src: image.originalUrl || image.imageUrl,
        type: "custom_image",
        fileName: image.fileName,
      })
    );
    e.dataTransfer.setData(
      "text/uri-list",
      image.originalUrl || image.imageUrl
    );
    e.dataTransfer.setData("text/plain", image.originalUrl || image.imageUrl);
    e.dataTransfer.effectAllowed = "copy";
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
      return undefined;
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
    }
  };

  if (!currentData) {
    return null;
  }

  return (
    <>
      <div className="flex-1 space-y-1.5">
        {/* Catalog Button */}
        <button
          type="button"
          onClick={() => setIsCatalogOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-none hover:bg-gray-100 hover:border-gray-300 transition-all mb-2"
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          <span>View Full Catalog</span>
        </button>

        {/* Show catalog sections only when expanded */}
        <div className="overflow-hidden transition-all duration-500 ease-in-out">
          <div
            className="space-y-1.5 transition-all duration-500 ease-in-out"
          >
            {/* Custom Images Section */}
            <ExpandableSectionCompact
              title="Custom Images"
              expanded={expandedSection === "custom_images"}
              onToggle={() => handleSectionToggle("custom_images")}
            >
              <div className="grid grid-cols-12 gap-1 max-h-">
                {/* Upload Box - First item in grid */}
                <div
                  className={cn(
                    "group relative flex flex-col items-center justify-center gap-1 p-1.5 rounded border-2 border-dashed transition-all",
                    uploading || inputImagesLoading
                      ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!uploading && !inputImagesLoading) {
                      e.currentTarget.classList.add(
                        "border-gray-400",
                        "bg-gray-100"
                      );
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!uploading && !inputImagesLoading) {
                      e.currentTarget.classList.remove(
                        "border-gray-400",
                        "bg-gray-100"
                      );
                    }
                  }}
                  onDrop={handleFileDrop}
                  onClick={() => {
                    if (!uploading && !inputImagesLoading) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div className="w-full aspect-square rounded flex flex-col items-center justify-center">
                    {uploading || inputImagesLoading ? (
                      <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-[9px] font-medium text-center text-gray-600 line-clamp-1 w-full">
                    {uploading || inputImagesLoading
                      ? "Uploading..."
                      : "Upload"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFileUpload(e.target.files);
                      if (e.target) e.target.value = "";
                    }}
                  />
                </div>

                {/* Images Grid */}
                {customImages.map((image) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, image)}
                    className="group relative flex flex-col items-center gap-1 p-1.5 rounded border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-full aspect-square rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={
                          image.thumbnailUrl ||
                          image.imageUrl ||
                          image.originalUrl
                        }
                        alt={image.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <span className="text-[9px] font-medium text-center text-gray-700 line-clamp-1 w-full">
                      {image.fileName || `Image ${image.id}`}
                    </span>
                  </div>
                ))}
              </div>
            </ExpandableSectionCompact>

            {selectedStyle === "photorealistic" ? (
              <>
                <ExpandableSectionCompact
                  title="Type"
                  expanded={expandedSection === "type"}
                  onToggle={() => handleSectionToggle("type")}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {currentData.type?.map((option: any) => (
                      <CategorySelectorCompact
                        key={option.id}
                        title={option.name}
                        selected={selections.type === option.id}
                        onSelect={() => {
                          handleSelectionChange("type", option.id);
                          handleMaterialSelect(option, "customization", "type");
                        }}
                        showImage={false}
                        draggable={true}
                        dragData={{
                          option,
                          materialOption: "customization",
                          type: "type",
                        }}
                      />
                    ))}
                  </div>
                </ExpandableSectionCompact>

                <ExpandableSectionCompact
                  title="Walls"
                  expanded={expandedSection === "walls"}
                  onToggle={() => handleSectionToggle("walls")}
                >
                  <SubCategorySelectorCompact
                    data={currentData.walls}
                    selectedCategory={selections.walls?.category}
                    selectedOption={selections.walls?.option}
                    onSelectionChange={(category, option) => {
                      handleSelectionChange("walls", {
                        category,
                        option: option.id,
                      });
                      handleMaterialSelect(option, "material", "walls");
                    }}
                    getMaterialType={() => "walls"}
                    getMaterialOption={() => "material"}
                  />
                </ExpandableSectionCompact>

                <ExpandableSectionCompact
                  title="Floors"
                  expanded={expandedSection === "floors"}
                  onToggle={() => handleSectionToggle("floors")}
                >
                  <SubCategorySelectorCompact
                    data={currentData.floors}
                    selectedCategory={selections.floors?.category}
                    selectedOption={selections.floors?.option}
                    onSelectionChange={(category, option) => {
                      handleSelectionChange("floors", {
                        category,
                        option: option.id,
                      });
                      handleMaterialSelect(option, "material", "floors");
                    }}
                    getMaterialType={() => "floors"}
                    getMaterialOption={() => "material"}
                  />
                </ExpandableSectionCompact>

                <ExpandableSectionCompact
                  title="Context"
                  expanded={expandedSection === "context"}
                  onToggle={() => handleSectionToggle("context")}
                >
                  <SubCategorySelectorCompact
                    data={currentData.context}
                    selectedCategory={selections.context?.category}
                    selectedOption={selections.context?.option}
                    onSelectionChange={(category, option) => {
                      handleSelectionChange("context", {
                        category,
                        option: option.id,
                      });
                      handleMaterialSelect(option, "material", "context");
                    }}
                    getMaterialType={() => "context"}
                    getMaterialOption={() => "material"}
                  />
                </ExpandableSectionCompact>

                <ExpandableSectionCompact
                  title="Style"
                  expanded={expandedSection === "style"}
                  onToggle={() => handleSectionToggle("style")}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {currentData.style?.map((option: any) => (
                      <CategorySelectorCompact
                        key={option.id}
                        title={option.displayName}
                        imageUrl={option.thumbnailUrl}
                        selected={selections.style === option.id}
                        onSelect={() => {
                          handleSelectionChange("style", option.id);
                          handleMaterialSelect(
                            option,
                            "customization",
                            "style"
                          );
                        }}
                        showImage={true}
                        draggable={true}
                        dragData={{
                          option,
                          materialOption: "customization",
                          type: "style",
                        }}
                      />
                    ))}
                  </div>
                </ExpandableSectionCompact>

                <ExpandableSectionCompact
                  title="Weather"
                  expanded={expandedSection === "weather"}
                  onToggle={() => handleSectionToggle("weather")}
                >
                  <div className="grid grid-cols-2 gap-1">
                    {currentData.weather?.map((option: any) => (
                      <CategorySelectorCompact
                        key={option.id}
                        title={option.name}
                        selected={selections.weather === option.id}
                        onSelect={() => {
                          handleSelectionChange("weather", option.id);
                          handleMaterialSelect(
                            option,
                            "customization",
                            "weather"
                          );
                        }}
                        showImage={false}
                        draggable={true}
                        dragData={{
                          option,
                          materialOption: "customization",
                          type: "weather",
                        }}
                      />
                    ))}
                  </div>
                </ExpandableSectionCompact>

                <ExpandableSectionCompact
                  title="Lighting"
                  expanded={expandedSection === "lighting"}
                  onToggle={() => handleSectionToggle("lighting")}
                >
                  <div className="grid grid-cols-2 gap-1">
                    {currentData.lighting?.map((option: any) => (
                      <CategorySelectorCompact
                        key={option.id}
                        title={option.name}
                        selected={selections.lighting === option.id}
                        onSelect={() => {
                          handleSelectionChange("lighting", option.id);
                          handleMaterialSelect(
                            option,
                            "customization",
                            "lighting"
                          );
                        }}
                        showImage={false}
                        draggable={true}
                        dragData={{
                          option,
                          materialOption: "customization",
                          type: "lighting",
                        }}
                      />
                    ))}
                  </div>
                </ExpandableSectionCompact>
              </>
            ) : (
              <>
                {Object.entries(currentData).map(([subcategoryKey]) => (
                  <ExpandableSectionCompact
                    key={subcategoryKey}
                    title={subcategoryKey
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                    expanded={expandedSection === subcategoryKey}
                    onToggle={() => handleSectionToggle(subcategoryKey)}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {(currentData[subcategoryKey] as any[])?.map(
                        (option: any) => (
                          <CategorySelectorCompact
                            key={option.id}
                            title={option.displayName}
                            selected={selections[subcategoryKey] === option.id}
                            onSelect={() => {
                              handleSelectionChange(subcategoryKey, option.id);
                              handleMaterialSelect(
                                option,
                                "customization",
                                subcategoryKey
                              );
                            }}
                            showImage={!!option.thumbnailUrl}
                            imageUrl={option.thumbnailUrl}
                            draggable={true}
                            dragData={{
                              option,
                              materialOption: "customization",
                              type: subcategoryKey,
                            }}
                          />
                        )
                      )}
                    </div>
                  </ExpandableSectionCompact>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      <CatalogDialog
        open={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
      />
    </>
  );
};

export default MaterialCustomizationSettingsCompact;
