import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CreateUIState {
  selectedImageId: number | undefined;
  selectedImageType: 'input' | 'generated' | undefined; // Track image type to prevent ID collision
  baseInputImageId: number | undefined; // Base input image ID for the current selection
  isPromptModalOpen: boolean;
  isCatalogOpen: boolean; // Controls visibility of keywords/material catalog panel
  // Generation tracking
  isGenerating: boolean;
  generatingBatchId: number | undefined;
  generatingInputImageId: number | undefined;
  generatingInputImagePreviewUrl: string | undefined; // Store input image preview URL for generated images
}

const initialState: CreateUIState = {
  selectedImageId: undefined,
  selectedImageType: undefined,
  baseInputImageId: undefined,
  isPromptModalOpen: false,
  isCatalogOpen: false,
  // Generation tracking
  isGenerating: false,
  generatingBatchId: undefined,
  generatingInputImageId: undefined,
  generatingInputImagePreviewUrl: undefined,
};

const createUISlice = createSlice({
  name: 'createUI',
  initialState,
  reducers: {
    setSelectedImageId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedImageId = action.payload;
    },
    setSelectedImage: (state, action: PayloadAction<{ 
      id: number | undefined; 
      type: 'input' | 'generated' | undefined;
      baseInputImageId?: number | undefined;
    }>) => {
      state.selectedImageId = action.payload.id;
      state.selectedImageType = action.payload.type;
      
      // Set base input image ID based on selection type
      if (action.payload.type === 'input') {
        state.baseInputImageId = action.payload.id; // For input images, base = selected
      } else if (action.payload.type === 'generated') {
        state.baseInputImageId = action.payload.baseInputImageId; // For generated images, use provided base
      } else {
        state.baseInputImageId = undefined; // No selection
      }
    },
    setIsPromptModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPromptModalOpen = action.payload;
    },
    setIsCatalogOpen: (state, action: PayloadAction<boolean>) => {
      state.isCatalogOpen = action.payload;
    },
    toggleCatalogOpen: (state) => {
      state.isCatalogOpen = !state.isCatalogOpen;
    },
    // Generation tracking actions
    startGeneration: (state, action: PayloadAction<{
      batchId: number;
      inputImageId: number;
      inputImagePreviewUrl: string;
    }>) => {
      state.isGenerating = true;
      state.generatingBatchId = action.payload.batchId;
      state.generatingInputImageId = action.payload.inputImageId;
      state.generatingInputImagePreviewUrl = action.payload.inputImagePreviewUrl;
    },
    stopGeneration: (state) => {
      state.isGenerating = false;
      state.generatingInputImageId = undefined;
      state.generatingInputImagePreviewUrl = undefined;
    },
    clearGenerationBatch: (state) => {
      state.generatingBatchId = undefined;
      state.isGenerating = false;
      state.generatingInputImageId = undefined;
      state.generatingInputImagePreviewUrl = undefined;
    },
    setGeneratingBatchId: (state, action: PayloadAction<number | undefined>) => {
      state.generatingBatchId = action.payload;
      // Don't set isGenerating to true - this is for viewing existing batches
    },
  },
});

export const {
  setSelectedImageId,
  setSelectedImage,
  setIsPromptModalOpen,
  setIsCatalogOpen,
  toggleCatalogOpen,
  startGeneration,
  stopGeneration,
  clearGenerationBatch,
  setGeneratingBatchId
} = createUISlice.actions;
export default createUISlice.reducer;