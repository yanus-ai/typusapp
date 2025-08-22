import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CreateUIState {
  selectedImageId: number | undefined;
  selectedImageType: 'input' | 'generated' | undefined; // Track image type to prevent ID collision
  baseInputImageId: number | undefined; // Base input image ID for the current selection
  isPromptModalOpen: boolean;
}

const initialState: CreateUIState = {
  selectedImageId: undefined,
  selectedImageType: undefined,
  baseInputImageId: undefined,
  isPromptModalOpen: false,
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
  },
});

export const { setSelectedImageId, setSelectedImage, setIsPromptModalOpen } = createUISlice.actions;
export default createUISlice.reducer;