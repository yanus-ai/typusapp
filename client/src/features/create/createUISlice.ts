import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CreateUIState {
  selectedImageId: string | undefined;
  isPromptModalOpen: boolean;
}

const initialState: CreateUIState = {
  selectedImageId: undefined,
  isPromptModalOpen: false,
};

const createUISlice = createSlice({
  name: 'createUI',
  initialState,
  reducers: {
    setSelectedImageId: (state, action: PayloadAction<string | undefined>) => {
      state.selectedImageId = action.payload;
    },
    setIsPromptModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPromptModalOpen = action.payload;
    },
  },
});

export const { setSelectedImageId, setIsPromptModalOpen } = createUISlice.actions;
export default createUISlice.reducer;