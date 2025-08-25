import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface GalleryFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  source?: string;
}

interface GalleryState {
  layout: 'full' | 'square';
  imageSize: 'large' | 'medium' | 'small';
  filters: GalleryFilters;
  isFilterOpen: boolean;
  isModalOpen: boolean;
  mode: 'organize' | 'create' | 'tweak' | 'refine';
}

const initialState: GalleryState = {
  layout: 'square',
  imageSize: 'large',
  filters: {},
  isFilterOpen: false,
  isModalOpen: false,
  mode: 'organize',
};

const gallerySlice = createSlice({
  name: 'gallery',
  initialState,
  reducers: {
    setLayout: (state, action: PayloadAction<'full' | 'square'>) => {
      state.layout = action.payload;
    },
    setImageSize: (state, action: PayloadAction<'large' | 'medium' | 'small'>) => {
      state.imageSize = action.payload;
    },
    setFilters: (state, action: PayloadAction<GalleryFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setIsFilterOpen: (state, action: PayloadAction<boolean>) => {
      state.isFilterOpen = action.payload;
    },
    setIsModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
    },
    setMode: (state, action: PayloadAction<'organize' | 'create' | 'tweak' | 'refine'>) => {
      state.mode = action.payload;
    },
  },
});

export const {
  setLayout,
  setImageSize,
  setFilters,
  clearFilters,
  setIsFilterOpen,
  setIsModalOpen,
  setMode,
} = gallerySlice.actions;

export default gallerySlice.reducer;