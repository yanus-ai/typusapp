import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface HistoryImage {
  id: string;
  imageUrl: string;
  createdAt: Date;
}

interface HistoryImagesState {
  images: HistoryImage[];
  loading: boolean;
  error: string | null;
}

const initialState: HistoryImagesState = {
  images: [],
  loading: false,
  error: null,
};

// Async thunks
export const generateImages = createAsyncThunk(
  'historyImages/generateImages',
  async (prompt: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/generation/create', { prompt });
      return response.data.images.map((img: any) => ({
        id: img.id,
        imageUrl: img.originalUrl,
        createdAt: new Date(img.createdAt)
      }));
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate images');
    }
  }
);

const historyImagesSlice = createSlice({
  name: 'historyImages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Temporary action for demo purposes
    addDemoImage: (state, action: PayloadAction<string>) => {
      const newImage: HistoryImage = {
        id: Date.now().toString(),
        imageUrl: '/images/sample-building.jpg',
        createdAt: new Date()
      };
      state.images = [newImage, ...state.images];
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate images
      .addCase(generateImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateImages.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [...action.payload, ...state.images];
      })
      .addCase(generateImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, addDemoImage } = historyImagesSlice.actions;
export default historyImagesSlice.reducer;