import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface InputImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  createdAt: Date;
}

interface InputImagesState {
  images: InputImage[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: InputImagesState = {
  images: [],
  loading: false,
  error: null,
  uploadProgress: 0,
};

// Async thunks
export const fetchInputImages = createAsyncThunk(
  'inputImages/fetchInputImages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/images/input-images');
      return response.data.map((img: any) => ({
        id: img.id,
        imageUrl: img.originalUrl,
        thumbnailUrl: img.thumbnailUrl,
        fileName: img.fileName,
        createdAt: new Date(img.createdAt)
      }));
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch input images');
    }
  }
);

export const uploadInputImage = createAsyncThunk(
  'inputImages/uploadInputImage',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/images/upload-input', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        id: response.data.id,
        imageUrl: response.data.imageUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName || file.name,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload image');
    }
  }
);

const inputImagesSlice = createSlice({
  name: 'inputImages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch input images
      .addCase(fetchInputImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInputImages.fulfilled, (state, action) => {
        state.loading = false;
        state.images = action.payload;
      })
      .addCase(fetchInputImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Upload input image
      .addCase(uploadInputImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadInputImage.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
        state.uploadProgress = 0;
      })
      .addCase(uploadInputImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.uploadProgress = 0;
      });
  },
});

export const { clearError, setUploadProgress } = inputImagesSlice.actions;
export default inputImagesSlice.reducer;