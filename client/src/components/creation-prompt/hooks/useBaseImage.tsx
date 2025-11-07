import { useAppSelector } from "@/hooks/useAppSelector";

export function useBaseImage() {
  const selectedImageId = useAppSelector(
    (state) => state.createUI.selectedImageId
  );
  const selectedImageType = useAppSelector(
    (state) => state.createUI.selectedImageType
  );
  const inputImages = useAppSelector((state) => state.inputImages.images);
  const historyImages = useAppSelector((state) => state.historyImages.images);

  // Helper to get the base/original input image URL (always shows the source image)
  const getBaseImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }

    if (selectedImageType === "input") {
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      return (
        inputImage?.originalUrl ||
        inputImage?.imageUrl ||
        inputImage?.processedUrl
      );
    } else if (selectedImageType === "generated") {
      // For generated images, find the original input image
      const generatedImage = historyImages.find(
        (img) => img.id === selectedImageId
      );
      if (generatedImage?.originalInputImageId) {
        const originalInputImage = inputImages.find(
          (img) => img.id === generatedImage.originalInputImageId
        );
        return (
          originalInputImage?.originalUrl ||
          originalInputImage?.imageUrl ||
          originalInputImage?.processedUrl
        );
      }
    }

    return undefined;
  };

  // Helper to get the preview URL that ALWAYS shows the base input image (original uploaded image)
  const getPreviewImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }

    if (selectedImageType === "input") {
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      return inputImage?.originalUrl || inputImage?.imageUrl;
    } else if (selectedImageType === "generated") {
      // For generated images, first try to use the stored previewUrl, then fallback to finding original input image
      const generatedImage = historyImages.find(
        (img) => img.id === selectedImageId
      );

      // Use previewUrl from generated image if available
      if (generatedImage?.previewUrl) {
        return generatedImage.previewUrl;
      }

      // Fallback to finding original input image
      if (generatedImage?.originalInputImageId) {
        const originalInputImage = inputImages.find(
          (img) => img.id === generatedImage.originalInputImageId
        );
        return originalInputImage?.originalUrl || originalInputImage?.imageUrl;
      }
    }
    return undefined;
  };

  const getCurrentImageUrl = () => {
    if (!selectedImageId || !selectedImageType) {
      return undefined;
    }

    if (selectedImageType === "input") {
      const inputImage = inputImages.find((img) => img.id === selectedImageId);
      return (
        inputImage?.originalUrl ||
        inputImage?.imageUrl ||
        inputImage?.processedUrl
      );
    } else {
      const historyImage = historyImages.find(
        (img) => img.id === selectedImageId
      );
      return historyImage?.imageUrl || historyImage?.processedImageUrl;
    }
  };

  // Get base image URL (computed value for convenience)
  const baseImageUrl = getBaseImageUrl();

  return {
    selectedImageId,
    selectedImageType,
    inputImages,
    historyImages,
    baseImageUrl,
    getBaseImageUrl,
    getPreviewImageUrl,
    getCurrentImageUrl,
  };
}
