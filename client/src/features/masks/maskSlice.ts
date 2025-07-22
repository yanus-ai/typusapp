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

export interface AIPromptMaterial {
  id: number;
  inputImageId: number;
  materialOptionId?: number;
  customizationOptionId?: number;
  subCategoryId: number;
  displayName: string;
  materialOption?: {
    id: number;
    displayName: string;
    thumbnailUrl?: string;
    category?: {
      displayName: string;
    };
  };
  customizationOption?: {
    id: number;
    displayName: string;
    thumbnailUrl?: string;
    subCategory?: {
      displayName: string;
    };
  };
  subCategory: {
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
  // AI Prompt Materials state
  aiPromptMaterials: AIPromptMaterial[];
  aiPromptLoading: boolean;
  aiPromptError: string | null;
  savedPrompt: string | null;
}

const initialState: MaskState = {
  masks: [],
  maskStatus: 'none',
  selectedMaskId: null,
  loading: false,
  error: null,
  maskInputs: {},
  // AI Prompt Materials initial state
  aiPromptMaterials: [],
  aiPromptLoading: false,
  aiPromptError: null,
  savedPrompt: null,
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

// AI Prompt Materials async thunks
export const addAIPromptMaterial = createAsyncThunk(
  'masks/addAIPromptMaterial',
  async ({
    inputImageId,
    materialOptionId,
    customizationOptionId,
    subCategoryId,
    displayName
  }: {
    inputImageId: number;
    materialOptionId?: number;
    customizationOptionId?: number;
    subCategoryId: number;
    displayName: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/ai-prompt/materials', {
        inputImageId,
        materialOptionId,
        customizationOptionId,
        subCategoryId,
        displayName
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add AI prompt material');
    }
  }
);

export const getAIPromptMaterials = createAsyncThunk(
  'masks/getAIPromptMaterials',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/ai-prompt/materials/${inputImageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch AI prompt materials');
    }
  }
);

export const removeAIPromptMaterial = createAsyncThunk(
  'masks/removeAIPromptMaterial',
  async (materialId: number, { rejectWithValue }) => {
    try {
      await api.delete(`/ai-prompt/materials/${materialId}`);
      return materialId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove AI prompt material');
    }
  }
);

export const generateAIPrompt = createAsyncThunk(
  'masks/generateAIPrompt',
  async ({
    inputImageId,
    userPrompt,
    includeSelectedMaterials = true
  }: {
    inputImageId: number;
    userPrompt?: string;
    includeSelectedMaterials?: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/ai-prompt/generate', {
        inputImageId,
        userPrompt,
        includeSelectedMaterials
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate AI prompt');
    }
  }
);

export const getSavedPrompt = createAsyncThunk(
  'masks/getSavedPrompt',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/ai-prompt/prompt/${inputImageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get saved prompt');
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
    setAIPromptMaterial: (
      state,
      action: PayloadAction<{
        inputImageId: number;
        materialOptionId?: number;
        customizationOptionId?: number;
        subCategoryId: number;
        displayName: string;
        subCategoryName: string;
        imageUrl?: string;
      }>
    ) => {
      const { inputImageId, materialOptionId, customizationOptionId, subCategoryId, displayName, subCategoryName, imageUrl } = action.payload;
      
      // Check if exact same material already exists (excluding ID comparison)
      // Normalize undefined/null comparison since backend converts undefined to null
      const exactMatch = state.aiPromptMaterials.find(m => 
        m.subCategoryId === subCategoryId && 
        (m.materialOptionId || null) === (materialOptionId || null) &&
        (m.customizationOptionId || null) === (customizationOptionId || null) &&
        m.displayName === displayName
      );

      // If exact same material exists, don't add it (prevent exact duplicates)
      if (exactMatch) {
        return;
      }

      // Create a temporary material object for immediate UI feedback
      // This should match the exact structure returned by backend
      const tempId = -Date.now(); // Use negative timestamp to distinguish from real IDs
      const tempMaterial: AIPromptMaterial = {
        id: tempId, // Negative ID to distinguish from real database IDs
        inputImageId,
        materialOptionId,
        customizationOptionId,
        subCategoryId,
        displayName,
        subCategory: {
          id: subCategoryId,
          name: subCategoryName.toLowerCase(), // Backend stores this as lowercase (e.g., "type", "walls")
          displayName: subCategoryName, // Backend stores this as proper case (e.g., "Type", "Walls")
          slug: subCategoryName.toLowerCase()
        },
        materialOption: (materialOptionId && imageUrl) ? {
          id: materialOptionId,
          displayName,
          thumbnailUrl: imageUrl,
          category: {
            displayName: subCategoryName
          }
        } : undefined,
        customizationOption: (customizationOptionId && imageUrl) ? {
          id: customizationOptionId,
          displayName,
          thumbnailUrl: imageUrl,
          subCategory: {
            displayName: subCategoryName
          }
        } : undefined
      };

      // ADD (accumulate) the new material - do not replace existing ones
      state.aiPromptMaterials.push(tempMaterial);
    },

    removeAIPromptMaterialLocal: (state, action: PayloadAction<number>) => {
      const materialId = action.payload;
      state.aiPromptMaterials = state.aiPromptMaterials.filter(
        m => m.id !== materialId
      );
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

    // AI Prompt Materials reducers
    clearAIPromptError: (state) => {
      state.aiPromptError = null;
    },
    clearSavedPrompt: (state) => {
      state.savedPrompt = null;
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
      })
      // AI Prompt Materials
      .addCase(addAIPromptMaterial.pending, (state) => {
        state.aiPromptLoading = true;
        state.aiPromptError = null;
      })
      .addCase(addAIPromptMaterial.fulfilled, (state, action) => {
          state.aiPromptLoading = false;
          const newMaterial = action.payload.data;
          
          // Find the temporary material that matches this backend response
          // Temporary materials have negative IDs (created with -Date.now())
          // Normalize undefined/null comparison since backend converts undefined to null
          const tempMaterialIndex = state.aiPromptMaterials.findIndex(m => 
            m.subCategoryId === newMaterial.subCategoryId && 
            (m.materialOptionId || null) === (newMaterial.materialOptionId || null) &&
            (m.customizationOptionId || null) === (newMaterial.customizationOptionId || null) &&
            m.displayName === newMaterial.displayName &&
            m.id < 0 // Temporary materials have negative IDs
          );

          if (tempMaterialIndex !== -1) {
            // Replace temporary material with real backend material
            state.aiPromptMaterials[tempMaterialIndex] = newMaterial;
          } else {
            // Check if this exact material already exists (excluding ID comparison)
            // Normalize undefined/null comparison since backend converts undefined to null
            const exactMatch = state.aiPromptMaterials.find(m => 
              m.subCategoryId === newMaterial.subCategoryId && 
              (m.materialOptionId || null) === (newMaterial.materialOptionId || null) &&
              (m.customizationOptionId || null) === (newMaterial.customizationOptionId || null) &&
              m.displayName === newMaterial.displayName
            );

            // Only add if it doesn't already exist
            if (!exactMatch) {
              state.aiPromptMaterials.push(newMaterial);
            }
          }
      })
      .addCase(addAIPromptMaterial.rejected, (state, action) => {
        state.aiPromptLoading = false;
        state.aiPromptError = action.payload as string;
      })
      .addCase(getAIPromptMaterials.pending, (state) => {
        state.aiPromptLoading = true;
        state.aiPromptError = null;
      })
      .addCase(getAIPromptMaterials.fulfilled, (state, action) => {
        state.aiPromptLoading = false;
        state.aiPromptMaterials = action.payload.data.materials || [];
      })
      .addCase(getAIPromptMaterials.rejected, (state, action) => {
        state.aiPromptLoading = false;
        state.aiPromptError = action.payload as string;
      })
      .addCase(removeAIPromptMaterial.fulfilled, (state, action) => {
        const materialId = action.payload;
        state.aiPromptMaterials = state.aiPromptMaterials.filter(
          m => m.id !== materialId
        );
      })
      .addCase(generateAIPrompt.pending, (state) => {
        state.aiPromptLoading = true;
        state.aiPromptError = null;
      })
      .addCase(generateAIPrompt.fulfilled, (state, action) => {
        state.aiPromptLoading = false;
        state.savedPrompt = action.payload.data.generatedPrompt;
      })
      .addCase(generateAIPrompt.rejected, (state, action) => {
        state.aiPromptLoading = false;
        state.aiPromptError = action.payload as string;
      })
      .addCase(getSavedPrompt.fulfilled, (state, action) => {
        state.savedPrompt = action.payload.data.generatedPrompt;
      })
      .addCase(getSavedPrompt.rejected, (state, action) => {
        // If no saved prompt exists, set to null to trigger default prompt
        state.savedPrompt = null;
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
  setMaskGenerationFailed,
  clearAIPromptError,
  clearSavedPrompt,
  setAIPromptMaterial,
  removeAIPromptMaterialLocal
} = maskSlice.actions;

export default maskSlice.reducer;