import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface MaskRegion {
  id: number;
  inputImageId: number;
  maskUrl: string;
  color: string;
  customText?: string;
  materialOption?: {
    id: number;
    displayName: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    category?: {
      displayName: string;
    };
  };
  customizationOption?: {
    id: number;
    displayName: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    subCategory?: {
      displayName: string;
    };
  };
  subCategory?: {
    id: number;
    name: string;
    displayName: string;
    slug: string;
  };
}

interface MaskState {
  masks: MaskRegion[];
  maskStatus: 'none' | 'processing' | 'completed' | 'failed';
  selectedMaskId: number | null;
  loading: boolean;
  error: string | null;
  maskInputs: { [maskId: number]: { displayName: string, imageUrl: string | null, category: string } };
}

const initialState: MaskState = {
  masks: [],
  maskStatus: 'none',
  selectedMaskId: null,
  loading: false,
  error: null,
  maskInputs: {},
};

// Async thunks
export const generateMasks = createAsyncThunk(
  'masks/generate',
  async ({ inputImageId, imageUrl, callbackUrl }: { 
    inputImageId: number; 
    imageUrl: string; 
    callbackUrl?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/masks/generate', {
        inputImageId,
        imageUrl,
        callbackUrl
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate masks');
    }
  }
);

export const getMasks = createAsyncThunk(
  'masks/getMasks',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/masks/${inputImageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch masks');
    }
  }
);

export const updateMaskStyle = createAsyncThunk(
  'masks/updateStyle',
  async ({ 
    maskId, 
    materialOptionId, 
    customizationOptionId,
    customText,
    subCategoryId
  }: { 
    maskId: number; 
    materialOptionId?: number; 
    customizationOptionId?: number; 
    customText?: string;
    subCategoryId?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/masks/${maskId}/style`, {
        materialOptionId,
        customizationOptionId,
        customText,
        subCategoryId
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update mask style');
    }
  }
);

export const clearMaskStyle = createAsyncThunk(
  'masks/clearStyle',
  async (maskId: number, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/masks/${maskId}/style`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear mask style');
    }
  }
);

// Add WebSocket-specific actions
export const subscribeToMaskUpdates = createAsyncThunk(
  'masks/subscribeToUpdates',
  async (inputImageId: number) => {
    // This will be handled by the WebSocket hook
    return { inputImageId };
  }
);

const maskSlice = createSlice({
  name: 'masks',
  initialState,
  reducers: {
    selectMask: (state, action: PayloadAction<number>) => {
      state.selectedMaskId = action.payload;
    },
    clearSelection: (state) => {
      state.selectedMaskId = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetMaskState: (state) => {
      state.masks = [];
      state.maskStatus = 'none';
      state.selectedMaskId = null;
      state.error = null;
    },
    setSelectedMaskId(state, action: PayloadAction<number | null>) {
      state.selectedMaskId = action.payload;
    },
    setMaskInput: (state, action: PayloadAction<{ maskId: number; value: { displayName: string; imageUrl: string | null, category: string } }>) => {
      state.maskInputs[action.payload.maskId] = action.payload.value;
    },
    // WebSocket-specific reducers
    setMaskGenerationComplete: (state, action: PayloadAction<{
      maskCount: number;
      masks: MaskRegion[];
    }>) => {
      state.loading = false;
      state.maskStatus = 'completed';
      state.masks = action.payload.masks;
      state.error = null;
      console.log('✅ Mask generation completed via WebSocket');
    },
    
    setMaskGenerationFailed: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.maskStatus = 'failed';
      state.error = action.payload;
      console.log('❌ Mask generation failed via WebSocket');
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate masks
      .addCase(generateMasks.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.maskStatus = 'processing';
      })
      .addCase(generateMasks.fulfilled, (state, action) => {
        state.loading = false;
        state.maskStatus = action.payload.data.status || 'processing';
      })
      .addCase(generateMasks.rejected, (state, action) => {
        state.loading = false;
        state.maskStatus = 'failed';
        state.error = action.payload as string;
      })
      // Get masks
      .addCase(getMasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMasks.fulfilled, (state, action) => {
        state.loading = false;
        state.masks = action.payload.data.maskRegions || [];
        state.maskStatus = action.payload.data.maskStatus || 'none';

        // Populate maskInputs from loaded data
        const maskInputs: MaskState['maskInputs'] = {};
        for (const mask of state.masks) {
          maskInputs[mask.id] = {
            displayName: mask.customText || mask.materialOption?.displayName || mask.customizationOption?.displayName || '',
            imageUrl: mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || null,
            category: mask.materialOption ? 'walls' : mask.customizationOption ? 'customization' : '',
          };
        }
        state.maskInputs = maskInputs;
      })
      .addCase(getMasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update mask style
      .addCase(updateMaskStyle.fulfilled, (state, action) => {
        const updatedMask = action.payload.data;
        const index = state.masks.findIndex(mask => mask.id === updatedMask.id);
        if (index !== -1) {
          state.masks[index] = updatedMask;
        }
      })
      .addCase(clearMaskStyle.fulfilled, (state, action) => {
        const updatedMask = action.payload.data;
        const index = state.masks.findIndex(mask => mask.id === updatedMask.id);
        if (index !== -1) {
          state.masks[index] = updatedMask;
          // Also clear maskInputs for this mask
          state.maskInputs[updatedMask.id] = { displayName: '', imageUrl: null, category: '' };
        }
      });
  },
});

export const { 
  selectMask, 
  clearSelection, 
  clearError, 
  resetMaskState,
  setSelectedMaskId,
  setMaskInput,
  setMaskGenerationComplete,
  setMaskGenerationFailed
} = maskSlice.actions;

export default maskSlice.reducer;