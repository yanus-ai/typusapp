import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface RefineMaterialsState {
  materials: string[]; // Materials loaded from database
  localMaterials: string[]; // Materials selected but not saved yet
  loading: boolean;
  error: string | null;
  currentInputImageId: number | null;
}

const initialState: RefineMaterialsState = {
  materials: [],
  localMaterials: [],
  loading: false,
  error: null,
  currentInputImageId: null,
};

// Async thunks for API calls
export const addRefineMaterial = createAsyncThunk(
  'refineMaterials/add',
  async ({ inputImageId, material }: { inputImageId: number; material: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/refine/materials/add', {
        inputImageId,
        material
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add material');
    }
  }
);

export const removeRefineMaterial = createAsyncThunk(
  'refineMaterials/remove',
  async ({ inputImageId, material }: { inputImageId: number; material: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/refine/materials/remove', {
        inputImageId,
        material
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove material');
    }
  }
);

export const getRefineMaterials = createAsyncThunk(
  'refineMaterials/get',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/refine/materials/${inputImageId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch materials');
    }
  }
);

export const clearRefineMaterials = createAsyncThunk(
  'refineMaterials/clear',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/refine/materials/clear/${inputImageId}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to clear materials');
    }
  }
);

export const updateRefineMaterials = createAsyncThunk(
  'refineMaterials/update',
  async ({ inputImageId, materials }: { inputImageId: number; materials: string[] }, { rejectWithValue }) => {
    try {
      const response = await api.post('/refine/materials/update', {
        inputImageId,
        materials
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update materials');
    }
  }
);

// New thunk to save local materials to database
export const saveLocalMaterials = createAsyncThunk(
  'refineMaterials/saveLocal',
  async (inputImageId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { refineMaterials: RefineMaterialsState };
      const { materials, localMaterials } = state.refineMaterials;
      
      // Combine existing and local materials, remove duplicates
      const combinedMaterials = [...new Set([...materials, ...localMaterials])];
      
      if (localMaterials.length === 0) {
        // No new materials to save
        return { materials: combinedMaterials, inputImageId };
      }
      
      const response = await api.post('/refine/materials/update', {
        inputImageId,
        materials: combinedMaterials
      });
      
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to save local materials');
    }
  }
);

const refineMaterialsSlice = createSlice({
  name: 'refineMaterials',
  initialState,
  reducers: {
    // Local state management without API calls
    addMaterialLocal: (state, action: PayloadAction<string>) => {
      const material = action.payload.trim();
      if (material && !state.materials.includes(material)) {
        state.materials.push(material);
      }
    },

    removeMaterialLocal: (state, action: PayloadAction<string>) => {
      const material = action.payload.trim();
      state.materials = state.materials.filter(m => m !== material);
    },

    setMaterialsLocal: (state, action: PayloadAction<string[]>) => {
      state.materials = action.payload;
    },

    clearMaterialsLocal: (state) => {
      state.materials = [];
    },

    setCurrentInputImageId: (state, action: PayloadAction<number | null>) => {
      state.currentInputImageId = action.payload;
      // Clear materials and local materials when switching images
      if (action.payload !== state.currentInputImageId) {
        state.materials = [];
        state.localMaterials = [];
        state.error = null;
      }
    },

    // Local material management (no API calls)
    addLocalMaterial: (state, action: PayloadAction<string>) => {
      const material = action.payload;
      if (!state.localMaterials.includes(material)) {
        state.localMaterials.push(material);
      }
    },

    removeLocalMaterial: (state, action: PayloadAction<string>) => {
      const material = action.payload;
      state.localMaterials = state.localMaterials.filter(m => m !== material);
    },

    clearLocalMaterials: (state) => {
      state.localMaterials = [];
    },

    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Add material
    builder
      .addCase(addRefineMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addRefineMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.materials = action.payload.materials;
        state.currentInputImageId = action.payload.inputImageId;
      })
      .addCase(addRefineMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Remove material
    builder
      .addCase(removeRefineMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeRefineMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.materials = action.payload.materials;
      })
      .addCase(removeRefineMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Get materials
    builder
      .addCase(getRefineMaterials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRefineMaterials.fulfilled, (state, action) => {
        state.loading = false;
        console.log('🔍 DEBUG - getRefineMaterials fulfilled payload:', action.payload);
        console.log('🔍 DEBUG - Materials array:', action.payload.materials);
        console.log('🔍 DEBUG - First material type:', typeof action.payload.materials?.[0]);
        state.materials = action.payload.materials;
        state.currentInputImageId = action.payload.inputImageId;
      })
      .addCase(getRefineMaterials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Clear materials
    builder
      .addCase(clearRefineMaterials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearRefineMaterials.fulfilled, (state, action) => {
        state.loading = false;
        state.materials = action.payload.materials;
      })
      .addCase(clearRefineMaterials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update materials
    builder
      .addCase(updateRefineMaterials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRefineMaterials.fulfilled, (state, action) => {
        state.loading = false;
        state.materials = action.payload.materials;
      })
      .addCase(updateRefineMaterials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Save local materials
    builder
      .addCase(saveLocalMaterials.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveLocalMaterials.fulfilled, (state, action) => {
        state.loading = false;
        state.materials = action.payload.materials;
        state.localMaterials = []; // Clear local materials after saving
      })
      .addCase(saveLocalMaterials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addMaterialLocal,
  removeMaterialLocal,
  setMaterialsLocal,
  clearMaterialsLocal,
  setCurrentInputImageId,
  addLocalMaterial,
  removeLocalMaterial,
  clearLocalMaterials,
  clearError
} = refineMaterialsSlice.actions;

export default refineMaterialsSlice.reducer;