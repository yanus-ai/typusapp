import React, { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import OnboardingPopup from "@/components/onboarding/OnboardingPopup";
import { PromptInputContainer } from "@/components/creation-prompt";
import CanvasImageGrid from "@/components/creation-prompt/prompt-input/CanvasImageGrid";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setSelectedImage } from "@/features/create/createUISlice";
import { fetchInputImagesBySource } from "@/features/images/inputImagesSlice";
import { fetchAllVariations } from "@/features/images/historyImagesSlice";
import toast from "react-hot-toast";
import { Images } from "lucide-react";

const CreatePageSimplified: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const dispatch = useAppDispatch();
  const [forceShowOnboarding, setForceShowOnboarding] =
    useState<boolean>(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [showImageGrid, setShowImageGrid] = useState(false);

  // Redux selectors  
  const historyImages = useAppSelector(state => state.historyImages.images);
  const historyImagesLoading = useAppSelector(state => state.historyImages.loading);
  const selectedImageId = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageType = useAppSelector(state => state.createUI.selectedImageType);

  // Filter history images for CREATE module
  const filteredHistoryImages = useMemo(() => {
    return historyImages.filter((image) => 
      image.moduleType === 'CREATE' && (
        image.status === 'COMPLETED' || 
        image.status === 'PROCESSING' || 
        !image.status
      )
    );
  }, [historyImages]);

  const handleStartTour = () => {
    setCurrentStep(0);
    setForceShowOnboarding(true);
  };

  // Load initial data
  useEffect(() => {
    if (initialDataLoaded) return;

    const loadInitialData = async () => {
      try {
        await Promise.all([
          dispatch(fetchInputImagesBySource({ uploadSource: 'CREATE_MODULE' })),
          dispatch(fetchAllVariations({ page: 1, limit: 100 }))
        ]);
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast.error('Failed to load images');
      }
    };

    loadInitialData();
  }, [dispatch, initialDataLoaded]);

  // Handle image selection
  const handleSelectImage = (imageId: number, sourceType: 'input' | 'generated' = 'input') => {
    dispatch(setSelectedImage({ id: imageId, type: sourceType }));
  };

  return (
    <MainLayout currentStep={currentStep} onStartTour={handleStartTour}>
      <OnboardingPopup
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        forceShow={forceShowOnboarding}
      />
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Central Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Toggle Button for Image Grid */}
          {!showImageGrid && filteredHistoryImages.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setShowImageGrid(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-gray-700"
              >
                <Images className="h-4 w-4" />
                View Images ({filteredHistoryImages.length})
              </button>
            </div>
          )}

          {/* Canvas Image Grid - Only show when toggled */}
          {showImageGrid && (
            <div className="absolute inset-0 z-20 bg-white border-t border-gray-200">
              <CanvasImageGrid
                images={filteredHistoryImages}
                selectedImageId={selectedImageType === 'generated' ? selectedImageId : undefined}
                onSelectImage={(imageId, sourceType) => {
                  handleSelectImage(imageId, sourceType || 'generated');
                  setShowImageGrid(false);
                }}
                loading={historyImagesLoading}
                downloadingImageId={undefined}
                downloadProgress={0}
                onClose={() => setShowImageGrid(false)}
              />
            </div>
          )}

          {/* Bottom Prompt Input */}
          <div className="flex-1 flex items-center justify-center bg-white p-4">
            <div className="w-full max-w-5xl">
              <PromptInputContainer />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CreatePageSimplified;
