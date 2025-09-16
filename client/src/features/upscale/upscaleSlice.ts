import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { upscaleApiService, UpscaleGenerationRequest } from '@/services/upscaleApi';

// Async thunks
export const generateUpscale = createAsyncThunk(
  'upscale/generateUpscale',
  async (params: UpscaleGenerationRequest, { rejectWithValue }) => {
    try {
      const response = await upscaleApiService.generateUpscale(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchUpscaleOperations = createAsyncThunk(
  'upscale/fetchUpscaleOperations',
  async (baseImageId: number, { rejectWithValue }) => {
    try {
      const response = await upscaleApiService.getUpscaleOperations(baseImageId);
      return response.operations;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Types
interface UpscaleOperation {
  id: number;
  imageUrl?: string;
  processedImageUrl?: string;
  thumbnailUrl?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  batchId: number;
  variationNumber: number;
  batch: {
    id: number;
    prompt: string;
    createdAt: string;
  };
}

interface UpscaleState {
  selectedImageId: number | null;
  selectedImageUrl: string | null;
  operations: UpscaleOperation[];
  loadingOperations: boolean;
  shouldFetchOperations: boolean;
  isGenerating: boolean;
  isPromptModalOpen: boolean;
  settings: {
    scale_factor: number;
    creativity: number;
    resemblance: number;
  };
  error: string | null;
}

const initialState: UpscaleState = {
  selectedImageId: null,
  selectedImageUrl: null,
  operations: [],
  loadingOperations: false,
  shouldFetchOperations: false,
  isGenerating: false,
  isPromptModalOpen: false,
  settings: {
    scale_factor: 2,
    creativity: 0.5,
    resemblance: 0.6
  },
  error: null
};

// Slice
const upscaleSlice = createSlice({
  name: 'upscale',
  initialState,
  reducers: {
    setSelectedImage: (state, action: PayloadAction<{id: number; url: string; type: 'input' | 'generated'}>) => {
      state.selectedImageId = action.payload.id;
      state.selectedImageUrl = action.payload.url;
      state.shouldFetchOperations = true;
    },
    setIsPromptModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPromptModalOpen = action.payload;
    },
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    updateSettings: (state, action: PayloadAction<Partial<UpscaleState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    resetSettings: (state) => {
      state.settings = initialState.settings;
    },
    addProcessingUpscaleVariations: (state, action: PayloadAction<{
      batchId: number;
      totalVariations: number;
      imageIds: number[];
    }>) => {
      const { batchId, totalVariations, imageIds } = action.payload;

      // Add processing placeholders to operations array
      const processingOperations = imageIds.map((imageId, index) => ({
        id: imageId,
        status: 'PROCESSING' as const,
        createdAt: new Date().toISOString(),
        batchId,
        variationNumber: index + 1,
        batch: {
          id: batchId,
          prompt: 'Upscale operation in progress...',
          createdAt: new Date().toISOString()
        }
      }));

      // Add to the beginning of operations array
      state.operations = [...processingOperations, ...state.operations];
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUpscaleOperations.pending, (state) => {
        state.loadingOperations = true;
        state.error = null;
      })
      .addCase(fetchUpscaleOperations.fulfilled, (state, action) => {
        state.loadingOperations = false;
        state.shouldFetchOperations = false;
        state.operations = action.payload;
      })
      .addCase(fetchUpscaleOperations.rejected, (state, action) => {
        state.loadingOperations = false;
        state.shouldFetchOperations = false;
        state.error = action.payload as string;
      })
      .addCase(generateUpscale.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateUpscale.fulfilled, (state, action) => {
        state.isGenerating = false;

        // Add processing placeholders immediately
        const processingOperations = action.payload.images.map((img, index) => ({
          id: img.id,
          status: 'PROCESSING' as const,
          createdAt: new Date().toISOString(),
          batchId: action.payload.batchId,
          variationNumber: index + 1,
          batch: {
            id: action.payload.batchId,
            prompt: 'Upscale operation in progress...',
            createdAt: new Date().toISOString()
          }
        }));

        // Add to the beginning of operations array
        state.operations = [...processingOperations, ...state.operations];
      })
      .addCase(generateUpscale.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setSelectedImage,
  setIsPromptModalOpen,
  setIsGenerating,
  updateSettings,
  resetSettings,
  addProcessingUpscaleVariations,
  clearError
} = upscaleSlice.actions;

export default upscaleSlice.reducer;