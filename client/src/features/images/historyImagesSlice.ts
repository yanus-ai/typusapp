import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { runpodApiService, RunPodGenerationRequest } from '@/services/runpodApi';

export interface HistoryImage {
  id: string;
  imageUrl: string;
  batchId?: string;
  createdAt: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  runpodId?: string;
  variationNumber?: number;
}

interface GenerationBatch {
  id: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  runpodId?: string;
  prompt: string;
  createdAt: string;
  estimatedTime?: string;
}

interface HistoryImagesState {
  images: HistoryImage[];
  batches: GenerationBatch[];
  loading: boolean;
  error: string | null;
}

const initialState: HistoryImagesState = {
  images: [],
  batches: [],
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

export const generateWithRunPod = createAsyncThunk(
  'historyImages/generateWithRunPod',
  async (request: RunPodGenerationRequest, { rejectWithValue }) => {
    try {
      const response = await runpodApiService.generateImages(request);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start RunPod generation');
    }
  }
);

export const fetchBatchStatus = createAsyncThunk(
  'historyImages/fetchBatchStatus',
  async (batchId: number, { rejectWithValue }) => {
    try {
      const response = await runpodApiService.getBatchStatus(batchId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch batch status');
    }
  }
);

export const fetchRunPodHistory = createAsyncThunk(
  'historyImages/fetchRunPodHistory',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await runpodApiService.getHistory(page, limit);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch history');
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
    // Handle WebSocket updates
    updateBatchFromWebSocket: (state, action: PayloadAction<{
      batchId: number;
      status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
      images?: any[];
    }>) => {
      const { batchId, status, images } = action.payload;
      
      // Update batch status
      const batchIndex = state.batches.findIndex(b => b.id === batchId);
      if (batchIndex !== -1) {
        state.batches[batchIndex].status = status;
      }
      
      // Add completed images to history
      if (status === 'COMPLETED' && images) {
        const newImages: HistoryImage[] = images.map(img => ({
          id: img.id.toString(),
          imageUrl: img.url,
          batchId: batchId.toString(),
          createdAt: new Date(img.createdAt || Date.now()),
          status: 'COMPLETED',
          variationNumber: img.variationNumber
        }));
        state.images = [...newImages, ...state.images];
      }
    },
    // Add processing batch to state (for immediate UI feedback)
    addProcessingBatch: (state, action: PayloadAction<GenerationBatch>) => {
      state.batches = [action.payload, ...state.batches];
    },
    // Temporary action for demo purposes
    addDemoImage: (state, _action: PayloadAction<string>) => {
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
      // Generate images (original)
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
      })
      
      // RunPod generation
      .addCase(generateWithRunPod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateWithRunPod.fulfilled, (state, action) => {
        state.loading = false;
        // Add the batch to state for tracking
        const newBatch: GenerationBatch = {
          id: action.payload.batchId,
          status: 'PROCESSING',
          runpodId: action.payload.runpodId,
          prompt: 'Generated with RunPod', // Will be updated from WebSocket
          createdAt: new Date().toISOString()
        };
        state.batches = [newBatch, ...state.batches];
      })
      .addCase(generateWithRunPod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch batch status
      .addCase(fetchBatchStatus.fulfilled, (state, action) => {
        const batch = action.payload;
        // Update batch in state
        const batchIndex = state.batches.findIndex(b => b.id === batch.batchId);
        if (batchIndex !== -1) {
          state.batches[batchIndex].status = batch.status;
          state.batches[batchIndex].prompt = batch.prompt;
        }
        
        // Add completed images to history
        if (batch.status === 'COMPLETED' && batch.images.length > 0) {
          const newImages: HistoryImage[] = batch.images.map(img => ({
            id: img.id.toString(),
            imageUrl: img.url,
            batchId: batch.batchId.toString(),
            createdAt: new Date(img.createdAt),
            status: 'COMPLETED',
            variationNumber: img.variationNumber
          }));
          
          // Only add images that aren't already in state
          const existingIds = new Set(state.images.map(img => img.id));
          const uniqueImages = newImages.filter(img => !existingIds.has(img.id));
          state.images = [...uniqueImages, ...state.images];
        }
      })
      
      // Fetch RunPod history
      .addCase(fetchRunPodHistory.fulfilled, (state, action) => {
        // Convert batches to images format for history display
        const historyImages: HistoryImage[] = action.payload.batches
          .filter(batch => batch.previewImage)
          .map(batch => ({
            id: `batch-${batch.id}`,
            imageUrl: batch.previewImage!,
            batchId: batch.id.toString(),
            createdAt: new Date(batch.createdAt),
            status: batch.status as any
          }));
        
        // Update images without duplicating
        const existingIds = new Set(state.images.map(img => img.id));
        const uniqueImages = historyImages.filter(img => !existingIds.has(img.id));
        state.images = [...state.images, ...uniqueImages];
      });
  },
});

export const { clearError, addDemoImage, updateBatchFromWebSocket, addProcessingBatch } = historyImagesSlice.actions;
export default historyImagesSlice.reducer;