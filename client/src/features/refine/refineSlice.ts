import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

// Types
export interface RefineResolution {
  width: number;
  height: number;
}

export interface RefineSettings {
  resolution: RefineResolution;
  scaleFactor: number; // 1x, 2x, 3x
  aiStrength: number; // 0-100
  resemblance: number; // 0-100
  clarity: number; // 0-100
  sharpness: number; // 0-100
  matchColor: boolean;
}

export interface RefineOperation {
  id: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  batchId: number;
  processedImageUrl?: string;
  resultImageUrl?: string;
  thumbnailUrl?: string;
  sourceImageId: number;
  sourceImageUrl: string;
  settings: RefineSettings;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface RefineState {
  // Selected image for refining
  selectedImageId: number | null;
  selectedImageUrl: string | null;
  selectedImageType: 'input' | 'generated' | null;
  
  // Available images for refining (from all modules)
  availableInputImages: any[];
  availableGeneratedImages: any[];
  loadingImages: boolean;
  
  // Current refine settings
  settings: RefineSettings;
  
  // Operations and results
  operations: RefineOperation[];
  loadingOperations: boolean;
  shouldFetchOperations: boolean;
  
  // Generation state
  isGenerating: boolean;
  currentBatchId: number | null;
  
  // UI state
  viewMode: 'generated' | 'before-after' | 'side-by-side';
  isPromptModalOpen: boolean;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

const defaultSettings: RefineSettings = {
  resolution: { width: 1969, height: 1969 },
  scaleFactor: 2,
  aiStrength: 12,
  resemblance: 12,
  clarity: 12,
  sharpness: 12,
  matchColor: true
};

const initialState: RefineState = {
  selectedImageId: null,
  selectedImageUrl: null,
  selectedImageType: null,
  
  availableInputImages: [],
  availableGeneratedImages: [],
  loadingImages: false,
  
  settings: defaultSettings,
  
  operations: [],
  loadingOperations: false,
  shouldFetchOperations: false,
  
  isGenerating: false,
  currentBatchId: null,
  
  viewMode: 'generated',
  isPromptModalOpen: false,
  
  loading: false,
  error: null
};

// Async Thunks

// Fetch available images for refining
export const fetchAvailableImages = createAsyncThunk(
  'refine/fetchAvailableImages',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch REFINE_MODULE input images
      const refineInputResponse = await api.get('/images/input-images-by-source/REFINE_MODULE');
      
      // Fetch all generated images from CREATE and TWEAK modules using the correct endpoint
      const generatedResponse = await api.get('/runpod/variations?page=1&limit=100');
      
      
      return {
        inputImages: refineInputResponse.data.images || [],
        generatedImages: generatedResponse.data.variations || []
      };
    } catch (error: any) {
      console.error('Failed to fetch available images for refine:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch available images');
    }
  }
);

// Fetch refine operations for selected image
export const fetchRefineOperations = createAsyncThunk(
  'refine/fetchRefineOperations',
  async (imageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/refine/operations/${imageId}`);
      return response.data.operations || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch refine operations');
    }
  }
);

// Generate refine
export const generateRefine = createAsyncThunk(
  'refine/generateRefine',
  async (params: {
    imageId: number;
    imageUrl: string;
    settings: RefineSettings;
    variations?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/refine/generate', {
        imageId: params.imageId,
        imageUrl: params.imageUrl,
        resolution: params.settings.resolution,
        scaleFactor: params.settings.scaleFactor,
        aiStrength: params.settings.aiStrength,
        resemblance: params.settings.resemblance,
        clarity: params.settings.clarity,
        sharpness: params.settings.sharpness,
        matchColor: params.settings.matchColor,
        variations: params.variations || 1
      });
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate refine');
    }
  }
);

// Load refine settings for image
export const loadRefineSettings = createAsyncThunk(
  'refine/loadRefineSettings',
  async (imageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/refine/settings/${imageId}`);
      return response.data.settings;
    } catch (error: any) {
      // If no settings found, return default settings
      if (error.response?.status === 404) {
        return defaultSettings;
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to load refine settings');
    }
  }
);

// Save refine settings for image
export const saveRefineSettings = createAsyncThunk(
  'refine/saveRefineSettings',
  async (params: {
    imageId: number;
    settings: RefineSettings;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/refine/settings', {
        imageId: params.imageId,
        ...params.settings
      });
      
      return response.data.settings;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save refine settings');
    }
  }
);

const refineSlice = createSlice({
  name: 'refine',
  initialState,
  reducers: {
    // Image selection
    setSelectedImage: (state, action: PayloadAction<{
      id: number;
      url: string;
      type: 'input' | 'generated';
    }>) => {
      state.selectedImageId = action.payload.id;
      state.selectedImageUrl = action.payload.url;
      state.selectedImageType = action.payload.type;
      state.error = null;
      
      // Mark that we need to fetch operations for the newly selected image
      state.shouldFetchOperations = true;
    },
    
    clearSelectedImage: (state) => {
      state.selectedImageId = null;
      state.selectedImageUrl = null;
      state.selectedImageType = null;
    },
    
    // Settings management
    updateSettings: (state, action: PayloadAction<Partial<RefineSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    resetSettings: (state) => {
      state.settings = defaultSettings;
    },
    
    updateResolution: (state, action: PayloadAction<RefineResolution>) => {
      state.settings.resolution = action.payload;
    },
    
    updateScaleFactor: (state, action: PayloadAction<number>) => {
      state.settings.scaleFactor = action.payload;
      // Auto-update resolution based on scale factor if we have a selected image
      // This would need image dimensions, will be handled in component
    },
    
    updateAIStrength: (state, action: PayloadAction<number>) => {
      state.settings.aiStrength = action.payload;
    },
    
    updateResemblance: (state, action: PayloadAction<number>) => {
      state.settings.resemblance = action.payload;
    },
    
    updateClarity: (state, action: PayloadAction<number>) => {
      state.settings.clarity = action.payload;
    },
    
    updateSharpness: (state, action: PayloadAction<number>) => {
      state.settings.sharpness = action.payload;
    },
    
    toggleMatchColor: (state) => {
      state.settings.matchColor = !state.settings.matchColor;
    },
    
    // View mode
    setViewMode: (state, action: PayloadAction<'generated' | 'before-after' | 'side-by-side'>) => {
      state.viewMode = action.payload;
    },
    
    // AI Prompt Modal
    setIsPromptModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPromptModalOpen = action.payload;
    },
    
    // Generation state
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    
    setCurrentBatchId: (state, action: PayloadAction<number | null>) => {
      state.currentBatchId = action.payload;
    },
    
    // Operations management
    addOperation: (state, action: PayloadAction<RefineOperation>) => {
      state.operations.unshift(action.payload);
    },
    
    updateOperation: (state, action: PayloadAction<Partial<RefineOperation> & { id: number }>) => {
      const index = state.operations.findIndex(op => op.id === action.payload.id);
      if (index !== -1) {
        state.operations[index] = { ...state.operations[index], ...action.payload };
      }
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch available images
    builder
      .addCase(fetchAvailableImages.pending, (state) => {
        state.loadingImages = true;
        state.error = null;
      })
      .addCase(fetchAvailableImages.fulfilled, (state, action) => {
        state.loadingImages = false;
        state.availableInputImages = action.payload.inputImages;
        state.availableGeneratedImages = action.payload.generatedImages;
        
        // Auto-select the most recent generated image if none is selected
        if (!state.selectedImageId && action.payload.generatedImages.length > 0) {
          // Sort by creation date and select the most recent
          const sortedImages = [...action.payload.generatedImages].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const latestImage = sortedImages[0];
          
          state.selectedImageId = latestImage.id;
          state.selectedImageUrl = latestImage.imageUrl;
          state.selectedImageType = 'generated';
          state.error = null;
          
          // Mark that we need to fetch operations for the auto-selected image
          state.shouldFetchOperations = true;
        }
      })
      .addCase(fetchAvailableImages.rejected, (state, action) => {
        state.loadingImages = false;
        state.error = action.payload as string;
      });
    
    // Fetch refine operations
    builder
      .addCase(fetchRefineOperations.pending, (state) => {
        state.loadingOperations = true;
        state.error = null;
      })
      .addCase(fetchRefineOperations.fulfilled, (state, action) => {
        state.loadingOperations = false;
        state.operations = action.payload;
        state.shouldFetchOperations = false;
      })
      .addCase(fetchRefineOperations.rejected, (state, action) => {
        state.loadingOperations = false;
        state.error = action.payload as string;
        state.shouldFetchOperations = false;
      });
    
    // Generate refine
    builder
      .addCase(generateRefine.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateRefine.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentBatchId = action.payload.batchId;
        // Operations will be updated via WebSocket
      })
      .addCase(generateRefine.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      });
    
    // Load refine settings
    builder
      .addCase(loadRefineSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadRefineSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(loadRefineSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Save refine settings
    builder
      .addCase(saveRefineSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveRefineSettings.fulfilled, (state) => {
        state.loading = false;
        // Settings already updated in state via updateSettings action
      })
      .addCase(saveRefineSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setSelectedImage,
  clearSelectedImage,
  updateSettings,
  resetSettings,
  updateResolution,
  updateScaleFactor,
  updateAIStrength,
  updateResemblance,
  updateClarity,
  updateSharpness,
  toggleMatchColor,
  setViewMode,
  setIsPromptModalOpen,
  setIsGenerating,
  setCurrentBatchId,
  addOperation,
  updateOperation,
  setError,
  clearError
} = refineSlice.actions;

export default refineSlice.reducer;
