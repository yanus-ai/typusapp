import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { runpodApiService, RunPodGenerationRequest } from '@/services/runpodApi';

export interface HistoryImage {
  id: number;
  imageUrl: string; // Original high-resolution image for canvas display
  processedImageUrl?: string; // Processed/resized URL for LORA training
  thumbnailUrl?: string;
  batchId?: number;
  createdAt: Date;
  updatedAt?: Date;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  moduleType?: 'CREATE' | 'TWEAK' | 'REFINE';
  operationType?: 'outpaint' | 'inpaint' | 'add_image' | 'unknown';
  runpodId?: string;
  runpodStatus?: string;
  variationNumber?: number;
  maskMaterialMappings?: Record<string, any>;
  aiPrompt?: string;
  aiMaterials?: any[];
  settingsSnapshot?: Record<string, any>; // Edit Inspector settings (creativity, expressivity, etc.)
  contextSelection?: string; // Context toolbar selection
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
  // New separated data for tweak page
  inputImages: HistoryImage[];
  createImages: HistoryImage[];
  tweakHistoryImages: HistoryImage[];
  selectedImageTweakHistory: HistoryImage[];
  currentBaseImageId: number | null;
  // Loading states
  loading: boolean;
  loadingInputAndCreate: boolean;
  loadingTweakHistory: boolean;
  error: string | null;
}

const initialState: HistoryImagesState = {
  images: [],
  batches: [],
  inputImages: [],
  createImages: [],
  tweakHistoryImages: [],
  selectedImageTweakHistory: [],
  currentBaseImageId: null,
  loading: false,
  loadingInputAndCreate: false,
  loadingTweakHistory: false,
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

export const fetchAllVariations = createAsyncThunk(
  'historyImages/fetchAllVariations',
  async ({ page = 1, limit = 50 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await runpodApiService.getAllVariations(page, limit);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch variations');
    }
  }
);

export const fetchInputAndCreateImages = createAsyncThunk(
  'historyImages/fetchInputAndCreateImages',
  async ({ page = 1, limit = 50, uploadSource }: { page?: number; limit?: number; uploadSource?: string } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (uploadSource) {
        params.append('uploadSource', uploadSource);
      }
      
      const response = await api.get(`/images/input-and-create?${params}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch input and create images');
    }
  }
);

export const fetchTweakHistoryForImage = createAsyncThunk(
  'historyImages/fetchTweakHistoryForImage',
  async ({ baseImageId }: { baseImageId: number }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/images/tweak-history/${baseImageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tweak history');
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
    clearTweakHistory: (state) => {
      state.tweakHistoryImages = [];
      state.selectedImageTweakHistory = [];
      state.currentBaseImageId = null;
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
          id: img.id,
          imageUrl: img.url,
          batchId: batchId,
          createdAt: new Date(img.createdAt || Date.now()),
          status: 'COMPLETED',
          variationNumber: img.variationNumber
        }));
        
        // Avoid duplicates
        const existingIds = new Set(state.images.map(img => img.id));
        const uniqueImages = newImages.filter(img => !existingIds.has(img.id));
        
        if (uniqueImages.length > 0) {
          state.images = [...uniqueImages, ...state.images];
        }
      }
    },
    // Add processing batch to state (for immediate UI feedback)
    addProcessingBatch: (state, action: PayloadAction<GenerationBatch>) => {
      state.batches = [action.payload, ...state.batches];
    },
    // Handle individual variation WebSocket updates
    updateVariationFromWebSocket: (state, action: PayloadAction<{
      batchId: number;
      imageId: number;
      variationNumber: number;
      imageUrl?: string;
      processedImageUrl?: string;
      thumbnailUrl?: string;
      status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
      runpodStatus?: string;
      operationType?: string;
      originalBaseImageId?: number;
    }>) => {
      const { batchId, imageId, variationNumber, imageUrl, processedImageUrl, thumbnailUrl, status, runpodStatus, operationType, originalBaseImageId } = action.payload;
      
      // Find existing image or create new one in main images
      const existingIndex = state.images.findIndex(img => img.id === imageId);
      
      if (existingIndex !== -1) {
        // Update existing image
        const existingImage = state.images[existingIndex];
        state.images[existingIndex] = {
          ...existingImage,
          imageUrl: imageUrl || existingImage.imageUrl, // Original URL for canvas display
          processedImageUrl: processedImageUrl || existingImage.processedImageUrl, // Processed URL for LORA training
          thumbnailUrl: thumbnailUrl || existingImage.thumbnailUrl,
          status,
          runpodStatus
        };
      } else if (imageUrl && (status === 'COMPLETED' || status === 'PROCESSING')) {
        // Only add new image if we have a URL or it's a processing state we want to show
        const newImage: HistoryImage = {
          id: imageId,
          imageUrl: imageUrl || '',
          processedImageUrl,
          thumbnailUrl,
          batchId,
          variationNumber,
          status,
          runpodStatus,
          createdAt: new Date()
        };
        state.images = [newImage, ...state.images];
      }
      
      // Also update tweak history if this is a tweak operation and we have the base image
      if ((operationType === 'outpaint' || operationType === 'inpaint') && originalBaseImageId) {
        const existingTweakIndex = state.selectedImageTweakHistory.findIndex(img => img.id === imageId);
        
        if (existingTweakIndex !== -1) {
          // Update existing tweak image
          const existingTweakImage = state.selectedImageTweakHistory[existingTweakIndex];
          state.selectedImageTweakHistory[existingTweakIndex] = {
            ...existingTweakImage,
            imageUrl: imageUrl || existingTweakImage.imageUrl,
            thumbnailUrl: thumbnailUrl || existingTweakImage.thumbnailUrl,
            status,
            runpodStatus
          };
          
          // Also update in tweakHistoryImages
          const tweakHistoryIndex = state.tweakHistoryImages.findIndex(img => img.id === imageId);
          if (tweakHistoryIndex !== -1) {
            state.tweakHistoryImages[tweakHistoryIndex] = state.selectedImageTweakHistory[existingTweakIndex];
          }
        } else if (imageUrl && status === 'COMPLETED') {
          // Add new completed tweak image
          const newTweakImage: HistoryImage = {
            id: imageId,
            imageUrl: imageUrl,
            thumbnailUrl,
            batchId,
            variationNumber,
            status,
            runpodStatus,
            operationType: operationType as any,
            createdAt: new Date()
          };
          
          // Add to both tweak history arrays
          state.selectedImageTweakHistory = [newTweakImage, ...state.selectedImageTweakHistory];
          state.tweakHistoryImages = [newTweakImage, ...state.tweakHistoryImages];
        }
      }
    },
    
    // Handle batch-level WebSocket updates
    updateBatchCompletionFromWebSocket: (state, action: PayloadAction<{
      batchId: number;
      status: 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';
      totalVariations: number;
      successfulVariations: number;
      failedVariations: number;
      completedImages?: Array<{
        id: number;
        url: string;
        thumbnailUrl?: string;
        variationNumber: number;
      }>;
    }>) => {
      const { batchId, completedImages } = action.payload;
      
      // Update batch status
      const batchIndex = state.batches.findIndex(b => b.id === batchId);
      if (batchIndex !== -1) {
        state.batches[batchIndex].status = action.payload.status as any;
      }
      
      // Update completed images - avoid duplicates
      if (completedImages) {
        completedImages.forEach(completedImg => {
          const existingIndex = state.images.findIndex(img => img.id === completedImg.id);
          if (existingIndex !== -1) {
            state.images[existingIndex] = {
              ...state.images[existingIndex],
              imageUrl: completedImg.url,
              thumbnailUrl: completedImg.thumbnailUrl,
              status: 'COMPLETED'
            };
          }
        });
      }
    },
    
    // Add processing variations when generation starts
    addProcessingVariations: (state, action: PayloadAction<{
      batchId: number;
      totalVariations: number;
      imageIds: number[];
    }>) => {
      const { batchId, imageIds } = action.payload;
      
      // Only add if they don't already exist (prevent duplicates)
      const existingIds = new Set(state.images.map(img => img.id));
      const newImageIds = imageIds.filter(id => !existingIds.has(id));

      if (newImageIds.length > 0) {
        const processingImages: HistoryImage[] = newImageIds.map((imageId, index) => ({
          id: imageId,
          imageUrl: '',
          batchId,
          variationNumber: index + 1,
          status: 'PROCESSING',
          runpodStatus: 'SUBMITTED',
          createdAt: new Date()
        }));
        
        state.images = [...processingImages, ...state.images];
      }
    },
    
    // Temporary action for demo purposes
    addDemoImage: (state, _action: PayloadAction<string>) => {
      const newImage: HistoryImage = {
        id: Date.now(),
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
            id: img.id,
            imageUrl: img.url,
            batchId: batch.batchId,
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
            id: batch.id,
            imageUrl: batch.previewImage!,
            batchId: batch.id,
            createdAt: new Date(batch.createdAt),
            status: batch.status as any
          }));
        
        // Update images without duplicating
        const existingIds = new Set(state.images.map(img => img.id));
        const uniqueImages = historyImages.filter(img => !existingIds.has(img.id));
        state.images = [...state.images, ...uniqueImages];
      })
      
      // Fetch all variations
      .addCase(fetchAllVariations.fulfilled, (state, action) => {
        // Convert variations to HistoryImage format
        const variationImages: HistoryImage[] = action.payload.variations.map((variation: any) => ({
          id: variation.id,
          imageUrl: variation.imageUrl,
          thumbnailUrl: variation.thumbnailUrl,
          batchId: variation.batchId,
          variationNumber: variation.variationNumber,
          status: 'COMPLETED',
          createdAt: new Date(variation.createdAt),
          // Include the generated image settings data
          maskMaterialMappings: variation.maskMaterialMappings || {},
          aiPrompt: variation.aiPrompt || undefined,
          aiMaterials: variation.aiMaterials || [],
          settingsSnapshot: variation.settingsSnapshot || {},
          contextSelection: variation.contextSelection || undefined
        }));

        // Replace existing images with fresh data from server
        state.images = variationImages;
      })
      
      // Fetch input and create images
      .addCase(fetchInputAndCreateImages.pending, (state) => {
        state.loadingInputAndCreate = true;
        state.error = null;
      })
      .addCase(fetchInputAndCreateImages.fulfilled, (state, action) => {
        state.loadingInputAndCreate = false;
        state.inputImages = action.payload.inputImages;
        state.createImages = action.payload.createImages;
      })
      .addCase(fetchInputAndCreateImages.rejected, (state, action) => {
        state.loadingInputAndCreate = false;
        state.error = action.payload as string;
      })
      
      // Fetch tweak history for specific image
      .addCase(fetchTweakHistoryForImage.pending, (state) => {
        state.loadingTweakHistory = true;
        state.error = null;
      })
      .addCase(fetchTweakHistoryForImage.fulfilled, (state, action) => {
        state.loadingTweakHistory = false;
        // Convert createdAt strings to Date objects for proper sorting
        const variations = action.payload.variations.map((variation: any) => ({
          ...variation,
          createdAt: new Date(variation.createdAt),
          updatedAt: variation.updatedAt ? new Date(variation.updatedAt) : undefined
        }));
        state.tweakHistoryImages = variations;
        state.selectedImageTweakHistory = variations;
        // Use currentBaseImageId from response (resolved by backend)
        state.currentBaseImageId = action.payload.currentBaseImageId || action.payload.baseImageId;
        console.log('🔄 Updated tweak history state with', variations.length, 'variations for base image', state.currentBaseImageId);
      })
      .addCase(fetchTweakHistoryForImage.rejected, (state, action) => {
        state.loadingTweakHistory = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  clearTweakHistory,
  addDemoImage, 
  updateBatchFromWebSocket, 
  addProcessingBatch,
  updateVariationFromWebSocket,
  updateBatchCompletionFromWebSocket,
  addProcessingVariations
} = historyImagesSlice.actions;
export default historyImagesSlice.reducer;