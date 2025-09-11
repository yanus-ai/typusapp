import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { runpodApiService, CreateFromBatchRequest, GenerateWithStateRequest } from '@/services/runpodApi';

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
  // Critical field for data isolation
  originalInputImageId?: number; // ID of the original InputImage used for this generation
  // Cross-module tracking fields
  createUploadId?: number; // InputImage ID when this image is used in CREATE module
  tweakUploadId?: number; // InputImage ID when this image is used in TWEAK module  
  refineUploadId?: number; // InputImage ID when this image is used in REFINE module
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
  allTweakImages: HistoryImage[]; // ALL tweak generated images globally
  allCreateImages: HistoryImage[]; // ALL create generated images globally
  currentBaseImageId: number | null;
  // Loading states
  loading: boolean;
  loadingInputAndCreate: boolean;
  loadingTweakHistory: boolean;
  loadingAllTweakImages: boolean;
  loadingAllCreateImages: boolean;
  error: string | null;
}

const initialState: HistoryImagesState = {
  images: [],
  batches: [],
  inputImages: [],
  createImages: [],
  tweakHistoryImages: [],
  selectedImageTweakHistory: [],
  allTweakImages: [],
  allCreateImages: [],
  currentBaseImageId: null,
  loading: false,
  loadingInputAndCreate: false,
  loadingTweakHistory: false,
  loadingAllTweakImages: false,
  loadingAllCreateImages: false,
  error: null,
};

// Core thunks - Keep only essential ones

export const generateWithCurrentState = createAsyncThunk(
  'historyImages/generateWithCurrentState',
  async (request: GenerateWithStateRequest, { rejectWithValue }) => {
    try {
      const response = await runpodApiService.generateWithCurrentState(request);
      return response;
    } catch (error: any) {
      // Pass through the complete error response for proper handling
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to start generation with current state',
        code: error.response?.data?.code,
        response: error.response
      });
    }
  }
);

export const createFromBatch = createAsyncThunk(
  'historyImages/createFromBatch',
  async (request: CreateFromBatchRequest, { rejectWithValue }) => {
    try {
      const response = await runpodApiService.createFromBatch(request);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create from batch');
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
  async ({ page = 1, limit = 100 }: { page?: number; limit?: number } = {}, { rejectWithValue }) => {
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
  async ({ page = 1, limit = 100, uploadSource }: { page?: number; limit?: number; uploadSource?: string } = {}, { rejectWithValue }) => {
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

// New thunk to fetch ALL tweak generated images (not just for selected base image)
export const fetchAllTweakImages = createAsyncThunk(
  'historyImages/fetchAllTweakImages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/images/all-user-images?moduleType=TWEAK&limit=100');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all tweak images');
    }
  }
);

// New thunk to fetch ALL create generated images (not just for selected base image)
// Use fetchAllVariations instead - this is redundant
// export const fetchAllCreateImages - REMOVED

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
      promptData?: any; // 🔥 ENHANCEMENT: Include prompt data from WebSocket
    }>) => {
      const { batchId, imageId, variationNumber, imageUrl, processedImageUrl, thumbnailUrl, status, runpodStatus, operationType, originalBaseImageId, promptData } = action.payload;
      
      // First, try to find and replace any placeholder image for this batch and variation
      const placeholderIndex = state.images.findIndex(img => 
        img.batchId === batchId && 
        img.variationNumber === variationNumber && 
        img.id < 0 // Negative ID indicates placeholder
      );
      
      if (placeholderIndex !== -1) {
        // Replace placeholder with real image data
        state.images[placeholderIndex] = {
          id: imageId,
          imageUrl: imageUrl || '',
          processedImageUrl,
          thumbnailUrl,
          batchId,
          variationNumber,
          status,
          runpodStatus,
          createdAt: new Date(),
          moduleType: 'CREATE' as const,
          operationType: operationType as any,
          originalBaseImageId,
          // 🔥 ENHANCEMENT: Include prompt data from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
        };
        
        // Also update in createImages and allCreateImages arrays
        const createPlaceholderIndex = state.createImages.findIndex(img => 
          img.batchId === batchId && 
          img.variationNumber === variationNumber && 
          img.id < 0
        );
        if (createPlaceholderIndex !== -1) {
          state.createImages[createPlaceholderIndex] = state.images[placeholderIndex];
        }
        
        const allCreatePlaceholderIndex = state.allCreateImages.findIndex(img => 
          img.batchId === batchId && 
          img.variationNumber === variationNumber && 
          img.id < 0
        );
        if (allCreatePlaceholderIndex !== -1) {
          state.allCreateImages[allCreatePlaceholderIndex] = state.images[placeholderIndex];
        }
        
        return; // Exit early since we replaced the placeholder
      }
      
      // Find existing image by ID (for updates to existing real images)
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
          runpodStatus,
          moduleType: existingImage.moduleType || 'CREATE',
          // 🔥 ENHANCEMENT: Update with prompt data from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
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
          createdAt: new Date(),
          moduleType: 'CREATE' as const,
          // 🔥 ENHANCEMENT: Include prompt data for new images from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
        };
        state.images = [newImage, ...state.images];
      }

      // Also update allCreateImages for CREATE module variations
      const existingCreateIndex = state.allCreateImages.findIndex(img => img.id === imageId);
      if (existingCreateIndex !== -1) {
        // Update existing CREATE image
        const existingCreateImage = state.allCreateImages[existingCreateIndex];
        state.allCreateImages[existingCreateIndex] = {
          ...existingCreateImage,
          imageUrl: imageUrl || existingCreateImage.imageUrl,
          processedImageUrl: processedImageUrl || existingCreateImage.processedImageUrl,
          thumbnailUrl: thumbnailUrl || existingCreateImage.thumbnailUrl,
          status,
          runpodStatus,
          // 🔥 ENHANCEMENT: Update with prompt data from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
        };
      } else if (imageUrl && (status === 'COMPLETED' || status === 'PROCESSING')) {
        // Add new CREATE image if it doesn't exist in allCreateImages
        const newCreateImage: HistoryImage = {
          id: imageId,
          imageUrl: imageUrl || '',
          processedImageUrl,
          thumbnailUrl,
          batchId,
          variationNumber,
          status,
          runpodStatus,
          createdAt: new Date(),
          moduleType: 'CREATE' as const,
          // 🔥 ENHANCEMENT: Include prompt data for new images from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
        };
        state.allCreateImages = [newCreateImage, ...state.allCreateImages];
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
            createdAt: new Date(),
            // 🔥 ENHANCEMENT: Include prompt data for new tweak images from WebSocket
            ...(promptData && {
              aiPrompt: promptData.prompt,
              settingsSnapshot: promptData.settingsSnapshot
            })
          };
          
          // Add to both tweak history arrays
          state.selectedImageTweakHistory = [newTweakImage, ...state.selectedImageTweakHistory];
          state.tweakHistoryImages = [newTweakImage, ...state.tweakHistoryImages];
        }
      }
      
      // Also update allTweakImages for TWEAK operations
      const existingTweakIndex = state.allTweakImages.findIndex(img => img.id === imageId);
      if (existingTweakIndex !== -1) {
        // Update existing tweak image (including placeholders with negative IDs)
        const existingTweakImage = state.allTweakImages[existingTweakIndex];
        state.allTweakImages[existingTweakIndex] = {
          ...existingTweakImage,
          id: imageId, // Replace negative placeholder ID with real ID
          imageUrl: imageUrl || existingTweakImage.imageUrl,
          processedImageUrl: processedImageUrl || existingTweakImage.processedImageUrl,
          thumbnailUrl: thumbnailUrl || existingTweakImage.thumbnailUrl,
          status,
          runpodStatus,
          operationType: operationType as any,
          // 🔥 ENHANCEMENT: Update with prompt data from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
        };
      } else if (imageUrl && (status === 'COMPLETED' || status === 'PROCESSING')) {
        // Add new tweak image if it doesn't exist in allTweakImages
        const newTweakImage: HistoryImage = {
          id: imageId,
          imageUrl: imageUrl || '',
          processedImageUrl,
          thumbnailUrl,
          batchId,
          variationNumber,
          status,
          runpodStatus,
          operationType: operationType as any,
          createdAt: new Date(),
          moduleType: 'TWEAK' as const,
          // 🔥 ENHANCEMENT: Include prompt data for new tweak images from WebSocket
          ...(promptData && {
            aiPrompt: promptData.prompt,
            settingsSnapshot: promptData.settingsSnapshot
          })
        };
        
        // Add to allTweakImages array
        state.allTweakImages = [newTweakImage, ...state.allTweakImages];
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
    
    // Simplified processing - just use WebSocket updates
    
    // Add processing variations to existing batch
    addProcessingVariations: (state, action: PayloadAction<{
      batchId: number;
      totalVariations: number;
      imageIds: number[];
    }>) => {
      const { batchId, imageIds } = action.payload;
      
      // Add placeholder processing images for immediate UI feedback
      const placeholderImages: HistoryImage[] = imageIds.map((imageId, index) => ({
        id: imageId,
        imageUrl: '',
        thumbnailUrl: '',
        batchId,
        variationNumber: index + 1,
        status: 'PROCESSING',
        runpodStatus: 'QUEUED',
        operationType: 'unknown',
        createdAt: new Date(),
        moduleType: 'CREATE' as const
      }));
      
      // Add to main images array
      state.images = [...placeholderImages, ...state.images];
    },

    // Add processing variations specifically for tweak operations (allTweakImages)
    addProcessingTweakVariations: (state, action: PayloadAction<{
      batchId: number;
      totalVariations: number;
      imageIds: number[];
    }>) => {
      const { batchId, imageIds } = action.payload;
      
      // Add placeholder processing images for immediate UI feedback in tweak history
      const placeholderImages: HistoryImage[] = imageIds.map((imageId, index) => ({
        id: imageId,
        imageUrl: '',
        thumbnailUrl: '',
        batchId,
        variationNumber: index + 1,
        status: 'PROCESSING',
        runpodStatus: 'QUEUED',
        operationType: 'inpaint',
        createdAt: new Date(),
        moduleType: 'TWEAK' as const
      }));
      
      // Add to allTweakImages array for immediate display in tweak history panel
      state.allTweakImages = [...placeholderImages, ...state.allTweakImages];
    },

    // Add processing variations specifically for CREATE operations (main history panel)
    addProcessingCreateVariations: (state, action: PayloadAction<{
      batchId: number;
      totalVariations: number;
      imageIds: number[];
    }>) => {
      const { batchId, imageIds } = action.payload;
      
      console.log('🔥 ADDING PROCESSING CREATE VARIATIONS:', {
        batchId,
        imageIds,
        totalVariations: imageIds.length
      });
      
      // Add placeholder processing images for immediate UI feedback in CREATE history
      const placeholderImages: HistoryImage[] = imageIds.map((imageId, index) => ({
        id: imageId,
        imageUrl: '',
        thumbnailUrl: '',
        batchId,
        variationNumber: index + 1,
        status: 'PROCESSING',
        runpodStatus: 'QUEUED',
        operationType: 'unknown',
        createdAt: new Date(),
        moduleType: 'CREATE' as const
      }));
      
      // Add to multiple arrays for CREATE module display
      state.images = [...placeholderImages, ...state.images];
      state.createImages = [...placeholderImages, ...state.createImages];
      state.allCreateImages = [...placeholderImages, ...state.allCreateImages];
      
      console.log('✅ Added processing CREATE variations to state:', placeholderImages.length);
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
      // Generate with current state
      .addCase(generateWithCurrentState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateWithCurrentState.fulfilled, (state, action) => {
        state.loading = false;
        // Add the batch to state for tracking
        const newBatch: GenerationBatch = {
          id: action.payload.batchId,
          status: 'PROCESSING',
          runpodId: action.payload.runpodId,
          prompt: 'Generated with Current State', // Will be updated from WebSocket
          createdAt: new Date().toISOString()
        };
        state.batches = [newBatch, ...state.batches];
        
        // 🔥 NEW: Don't add placeholder images here - they will be added manually in CreatePage
        // using addProcessingCreateVariations action, just like Tweak page does
        console.log('✅ Generation started, batch added to state. Placeholder images will be added manually.');
      })
      .addCase(generateWithCurrentState.rejected, (state, action) => {
        state.loading = false;
        // Handle both string and object error payloads
        const payload = action.payload as any;
        state.error = typeof payload === 'string' ? payload : payload?.message || 'Generation failed';
      })
      
      // Create from batch
      .addCase(createFromBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFromBatch.fulfilled, (state, action) => {
        state.loading = false;
        // Add the batch to state for tracking
        const newBatch: GenerationBatch = {
          id: action.payload.batchId,
          status: 'PROCESSING',
          runpodId: '', // Will be updated from WebSocket
          prompt: 'Created from batch', // Will be updated from WebSocket
          createdAt: new Date().toISOString()
        };
        state.batches = [newBatch, ...state.batches];
      })
      .addCase(createFromBatch.rejected, (state, action) => {
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
        // Convert variations to HistoryImage format with originalInputImageId
        const variationImages: HistoryImage[] = action.payload.variations.map((variation: any) => ({
          id: variation.id,
          imageUrl: variation.imageUrl,
          thumbnailUrl: variation.thumbnailUrl,
          processedImageUrl: variation.processedImageUrl,
          batchId: variation.batchId,
          variationNumber: variation.variationNumber,
          status: variation.status, // Use actual status from API (COMPLETED, PROCESSING, or FAILED)
          createdAt: new Date(variation.createdAt),
          moduleType: variation.moduleType, // Add moduleType field
          operationType: variation.operationType,
          runpodStatus: variation.runpodStatus,
          // CRITICAL: Extract originalInputImageId from batch.inputImageId
          originalInputImageId: variation.batch?.inputImageId || undefined,
          // Include the generated image settings data
          maskMaterialMappings: variation.maskMaterialMappings || {},
          aiPrompt: variation.aiPrompt || undefined,
          aiMaterials: variation.aiMaterials || [],
          settingsSnapshot: variation.settingsSnapshot || {},
          contextSelection: variation.contextSelection || undefined,
          // Cross-module tracking fields
          createUploadId: variation.createUploadId,
          tweakUploadId: variation.tweakUploadId,
          refineUploadId: variation.refineUploadId
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
      })

      // Fetch all tweak images
      .addCase(fetchAllTweakImages.pending, (state) => {
        state.loadingAllTweakImages = true;
        state.error = null;
      })
      .addCase(fetchAllTweakImages.fulfilled, (state, action) => {
        state.loadingAllTweakImages = false;
        // Convert createdAt strings to Date objects for proper sorting
        const allTweakImages = action.payload.images.map((image: any) => ({
          ...image,
          createdAt: new Date(image.createdAt),
          updatedAt: image.updatedAt ? new Date(image.updatedAt) : undefined
        }));
        state.allTweakImages = allTweakImages;
        console.log('🔄 Updated all tweak images with', allTweakImages.length, 'total tweak images');
      })
      .addCase(fetchAllTweakImages.rejected, (state, action) => {
        state.loadingAllTweakImages = false;
        state.error = action.payload as string;
      })

      // Use fetchAllVariations instead - removed redundant fetchAllCreateImages;
  },
});

export const { 
  clearError, 
  clearTweakHistory,
  addDemoImage, 
  updateBatchFromWebSocket, 
  addProcessingBatch,
  addProcessingVariations,
  addProcessingTweakVariations,
  addProcessingCreateVariations,
  updateVariationFromWebSocket,
  updateBatchCompletionFromWebSocket,
} = historyImagesSlice.actions;
export default historyImagesSlice.reducer;