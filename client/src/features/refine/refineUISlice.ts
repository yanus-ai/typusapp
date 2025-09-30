import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RefineUIState {
  selectedImageId: number | undefined;
  selectedImageType: 'input' | 'generated' | undefined; // Track image type to prevent ID collision
  baseInputImageId: number | undefined; // Base input image ID for the current selection
  isPromptModalOpen: boolean;
  // Generation tracking - exactly matching createUI slice
  isGenerating: boolean;
  generatingBatchId: number | undefined;
  generatingInputImageId: number | undefined;
  generatingInputImagePreviewUrl: string | undefined; // Store input image preview URL for generated images
}

const initialState: RefineUIState = {
  selectedImageId: undefined,
  selectedImageType: undefined,
  baseInputImageId: undefined,
  isPromptModalOpen: false,
  // Generation tracking
  isGenerating: false,
  generatingBatchId: undefined,
  generatingInputImageId: undefined,
  generatingInputImagePreviewUrl: undefined,
};

const refineUISlice = createSlice({
  name: 'refineUI',
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
    // Generation tracking actions - exactly matching createUI slice
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
      state.generatingBatchId = undefined;
      state.generatingInputImageId = undefined;
      state.generatingInputImagePreviewUrl = undefined;
    },
  },
});

export const {
  setSelectedImageId,
  setSelectedImage,
  setIsPromptModalOpen,
  startGeneration,
  stopGeneration
} = refineUISlice.actions;
export default refineUISlice.reducer;