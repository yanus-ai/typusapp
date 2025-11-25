import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface HistoryImageDeleteState {
  deletedImageIds: number[];
}

const initialState: HistoryImageDeleteState = {
  deletedImageIds: []
};

export const historyImageDeleteSlice = createSlice({
  name: 'historyImageDelete',
  initialState,
  reducers: {
    removeHistoryImage: (state, action: PayloadAction<number>) => {
      state.deletedImageIds.push(action.payload);
    },
    restoreHistoryImage: (state, action: PayloadAction<number>) => {
      state.deletedImageIds = state.deletedImageIds.filter(id => id !== action.payload);
    },
    clearDeletedImages: (state) => {
      state.deletedImageIds = [];
    }
  }
});

export const { removeHistoryImage, restoreHistoryImage, clearDeletedImages } = historyImageDeleteSlice.actions;

export default historyImageDeleteSlice.reducer;