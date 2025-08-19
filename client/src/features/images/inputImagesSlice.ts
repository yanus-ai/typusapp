import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface InputImage {
  id: number;
  originalUrl: string;        // S3 URL
  processedUrl?: string;      // Replicate processed URL
  imageUrl: string;           // Display URL (processedUrl || originalUrl)
  thumbnailUrl?: string;
  fileName: string;
  isProcessed: boolean;       // Whether Replicate processing succeeded
  createdAt: Date;
}

interface InputImagesState {
  images: InputImage[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
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
        originalUrl: img.originalUrl,
        processedUrl: img.processedUrl,
        imageUrl: img.originalUrl,
        thumbnailUrl: img.thumbnailUrl,
        fileName: img.fileName,
        isProcessed: !!img.processedUrl,
        createdAt: new Date(img.createdAt)
      }));
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch input images');
    }
  }
);

export const uploadInputImage = createAsyncThunk(
  'inputImages/uploadInputImage',
  async ({ file, uploadSource = 'CREATE_MODULE' }: { file: File; uploadSource?: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadSource', uploadSource);

      const response = await api.post('/images/upload-input', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.originalUrl, // Use original for high-quality canvas display
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName || file.name,
        uploadSource: response.data.uploadSource,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload image');
    }
  }
);

// Fetch input images by upload source
export const fetchInputImagesBySource = createAsyncThunk(
  'inputImages/fetchInputImagesBySource',
  async ({ uploadSource, page = 1, limit = 50 }: { uploadSource: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/images/input-images-by-source/${uploadSource}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch input images by source');
    }
  }
);

// Add this thunk before createSlice
export const convertGeneratedToInputImage = createAsyncThunk(
  'inputImages/convertGeneratedToInputImage',
  async (generatedImage: { url: string; fileName: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/images/convert-generated-to-input', {
        url: generatedImage.url,
        fileName: generatedImage.fileName,
      });

      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.originalUrl, // Use original for high-quality canvas display
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName || generatedImage.fileName,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert generated image');
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
      })
      // Fetch input images by source
      .addCase(fetchInputImagesBySource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInputImagesBySource.fulfilled, (state, action) => {
        state.loading = false;
        state.images = action.payload.inputImages;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInputImagesBySource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Convert generated image to input image
      .addCase(convertGeneratedToInputImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(convertGeneratedToInputImage.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
      })
      .addCase(convertGeneratedToInputImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUploadProgress } = inputImagesSlice.actions;
export default inputImagesSlice.reducer;