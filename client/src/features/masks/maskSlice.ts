import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface MaskRegion {
  id: number;
  inputImageId: number;
  maskUrl: string;
  color: string;
  customText?: string;
  isVisible?: boolean;
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
  subCategoryId?: number;        // Made optional for plain text materials
  displayName: string;
  isCustomText?: boolean;        // Added flag for plain text materials
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
  subCategory?: {               // Made optional for plain text materials
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
  // Per-image AI materials storage to prevent cross-contamination
  savedAIMaterialsByImage: { [imageKey: string]: AIPromptMaterial[] };
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
  // Per-image AI materials storage
  savedAIMaterialsByImage: {},
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

export const updateMaskVisibility = createAsyncThunk(
  'masks/updateVisibility',
  async ({ 
    maskId, 
    isVisible 
  }: { 
    maskId: number; 
    isVisible: boolean;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/masks/${maskId}/visibility`, {
        isVisible
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update mask visibility');
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
    materialsText,
    includeSelectedMaterials = true,
    systemPromptName = 'architectural-visualization'
  }: {
    inputImageId: number;
    userPrompt?: string;
    materialsText?: string;
    includeSelectedMaterials?: boolean;
    systemPromptName?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/ai-prompt/generate', {
        inputImageId,
        userPrompt,
        materialsText,
        includeSelectedMaterials,
        systemPromptName
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate AI prompt');
    }
  }
);

// NEW: Get saved prompt from InputImage table ONLY
export const getInputImageSavedPrompt = createAsyncThunk(
  'masks/getInputImageSavedPrompt',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/ai-prompt/input-image-prompt/${inputImageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get InputImage saved prompt');
    }
  }
);

// NEW: Get saved prompt from Generated Image table ONLY
export const getGeneratedImageSavedPrompt = createAsyncThunk(
  'masks/getGeneratedImageSavedPrompt',
  async (imageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/ai-prompt/generated-image-prompt/${imageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get Generated Image saved prompt');
    }
  }
);

// LEGACY: Keep old function for backward compatibility but mark as deprecated
export const getSavedPrompt = createAsyncThunk(
  'masks/getSavedPrompt',
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      console.warn('⚠️ getSavedPrompt is deprecated. Use getInputImageSavedPrompt or getGeneratedImageSavedPrompt instead');
      const response = await api.get(`/ai-prompt/prompt/${inputImageId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get saved prompt');
    }
  }
);

export const savePrompt = createAsyncThunk(
  'masks/savePrompt',
  async ({ inputImageId, prompt }: { inputImageId: number; prompt: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/ai-prompt/prompt/${inputImageId}`, { prompt });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save prompt');
    }
  }
);

// Save all Redux state configurations to database in batch (called when Generate is clicked)
export const saveAllConfigurationsToDatabase = createAsyncThunk(
  'masks/saveAllConfigurationsToDatabase',
  async ({ inputImageId }: { inputImageId: number }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const maskState = state.masks;
      
      
      // 1. Save all mask material mappings (including user-typed input)
      const maskSavePromises = maskState.masks
        .filter((mask: MaskRegion) => {
          // Save if mask has existing data OR user has typed something in the input
          const hasExistingData = mask.customText || mask.materialOption || mask.customizationOption;
          const hasUserInput = maskState.maskInputs[mask.id]?.displayName?.trim();
          return hasExistingData || hasUserInput;
        })
        .map((mask: MaskRegion) => {
          // Use user input if available, otherwise fall back to existing customText
          const userInput = maskState.maskInputs[mask.id]?.displayName?.trim();
          const finalCustomText = userInput || mask.customText || '';
          
          
          return api.put(`/masks/${mask.id}/style`, {
            materialOptionId: mask.materialOption?.id,
            customizationOptionId: mask.customizationOption?.id,
            customText: finalCustomText,
            subCategoryId: mask.subCategory?.id
          });
        });
      
      // 2. Save all AI prompt materials
      const aiMaterialSavePromises = maskState.aiPromptMaterials
        .filter((material: AIPromptMaterial) => material.id < 0) // Only save temporary materials (negative IDs)
        .map((material: AIPromptMaterial) => {
          return api.post('/ai-prompt/materials', {
            inputImageId,
            materialOptionId: material.materialOptionId,
            customizationOptionId: material.customizationOptionId,
            subCategoryId: material.subCategoryId,
            displayName: material.displayName
          });
        });
      
      // 3. Save AI prompt if exists
      let promptSavePromise = null;
      if (maskState.savedPrompt) {
        promptSavePromise = api.post(`/ai-prompt/prompt/${inputImageId}`, { 
          prompt: maskState.savedPrompt 
        });
      }
      
      // Execute all saves in parallel
      const allPromises = [
        ...maskSavePromises,
        ...aiMaterialSavePromises,
        ...(promptSavePromise ? [promptSavePromise] : [])
      ];
      
      await Promise.all(allPromises);
      
      return { success: true, savedCount: allPromises.length };
      
    } catch (error: any) {
      console.error('❌ Failed to save configurations to database:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to save configurations');
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
    // Restore mask material mappings from generated image settings
    restoreMaskMaterialMappings: (state, action: PayloadAction<Record<string, any>>) => {
      const maskMaterialMappings = action.payload;
      
      
      // Apply the saved mappings to the loaded mask regions
      state.masks = state.masks.map(mask => {
        const mappingKey = `mask_${mask.id}`;
        const savedMapping = maskMaterialMappings[mappingKey];
        
        if (savedMapping) {
          return {
            ...mask,
            customText: savedMapping.customText,
            // Restore material option (walls, floors, etc.)
            materialOption: savedMapping.materialOptionId ? {
              id: savedMapping.materialOptionId,
              displayName: savedMapping.materialOptionName || savedMapping.customText,
              thumbnailUrl: savedMapping.materialOptionThumbnailUrl,
              imageUrl: savedMapping.materialOptionImageUrl,
              category: savedMapping.materialOptionCategory ? {
                displayName: savedMapping.materialOptionCategory
              } : undefined
            } : undefined,
            // Restore customization option (type, style, weather, lighting, etc.)
            customizationOption: savedMapping.customizationOptionId ? {
              id: savedMapping.customizationOptionId,
              displayName: savedMapping.customizationOptionName || savedMapping.customText,
              thumbnailUrl: savedMapping.customizationOptionThumbnailUrl,
              imageUrl: savedMapping.customizationOptionImageUrl,
              subCategory: savedMapping.subCategoryName ? {
                displayName: savedMapping.subCategoryName,
                slug: savedMapping.subCategorySlug || 'unknown'
              } : undefined
            } : undefined,
            // Restore subcategory info - This is crucial for icon display
            subCategory: savedMapping.subCategoryId ? {
              id: savedMapping.subCategoryId,
              name: savedMapping.subCategorySlug || 'unknown',
              displayName: savedMapping.subCategoryName || 'Unknown',
              slug: savedMapping.subCategorySlug || 'unknown'
            } : undefined
          };
        }
        
        return mask;
      });

      // Update maskInputs to reflect the restored data
      const restoredMaskInputs: MaskState['maskInputs'] = {};
      for (const mask of state.masks) {
        restoredMaskInputs[mask.id] = {
          displayName: mask.customText || mask.materialOption?.displayName || mask.customizationOption?.displayName || '',
          imageUrl: mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || null,
          category: mask.materialOption ? 'walls' : mask.customizationOption ? 'customization' : '',
        };
      }
      state.maskInputs = restoredMaskInputs;
    },

    // Restore AI materials from generated image settings
    restoreAIMaterials: (state, action: PayloadAction<any[]>) => {
      const savedAIMaterials = action.payload;
      
      // Convert saved AI materials to the expected AIPromptMaterial format
      state.aiPromptMaterials = savedAIMaterials.map((material, index) => ({
        id: -(Date.now() + index), // Use negative IDs to distinguish from database IDs
        inputImageId: 0, // Will be updated when used
        materialOptionId: material.materialOption?.id,
        customizationOptionId: material.customizationOption?.id,
        subCategoryId: material.subCategoryId || 0,
        displayName: material.displayName || material.subCategory,
        subCategory: {
          id: material.subCategoryId || 0,
          name: material.subCategory?.toLowerCase() || 'unknown',
          displayName: material.subCategory || 'Unknown',
          slug: material.subCategory?.toLowerCase() || 'unknown'
        },
        materialOption: material.materialOption,
        customizationOption: material.customizationOption
      }));
      
    },

    // Clear all mask material selections (for switching to input images)
    clearMaskMaterialSelections: (state) => {
      state.masks = state.masks.map(mask => ({
        ...mask,
        customText: undefined,
        materialOption: undefined,
        customizationOption: undefined,
        subCategory: undefined
      }));
      state.maskInputs = {}; // Clear input state as well
    },

    // Save current AI materials for the current image
    saveCurrentAIMaterials: (state, action: PayloadAction<{ imageId: number; imageType: 'input' | 'generated' }>) => {
      const { imageId, imageType } = action.payload;
      const imageKey = `${imageType}-${imageId}`;
      
      // Only save if there are materials to save
      if (state.aiPromptMaterials.length > 0) {
        state.savedAIMaterialsByImage[imageKey] = [...state.aiPromptMaterials];
      } else {
        // Remove the key if no materials
        delete state.savedAIMaterialsByImage[imageKey];
      }
    },

    // Restore AI materials for a specific image
    restoreAIMaterialsForImage: (state, action: PayloadAction<{ imageId: number; imageType: 'input' | 'generated' }>) => {
      const { imageId, imageType } = action.payload;
      const imageKey = `${imageType}-${imageId}`;
      
      const savedMaterials = state.savedAIMaterialsByImage[imageKey];
      if (savedMaterials && savedMaterials.length > 0) {
        state.aiPromptMaterials = [...savedMaterials];
      } else {
        state.aiPromptMaterials = [];
      }
    },

    // Clear AI materials (updated to save before clearing)
    clearAIMaterials: (state, action?: PayloadAction<{ saveFor?: { imageId: number; imageType: 'input' | 'generated' } }>) => {
      // Save current materials if saveFor is provided
      if (action?.payload?.saveFor) {
        const { imageId, imageType } = action.payload.saveFor;
        const imageKey = `${imageType}-${imageId}`;
        
        if (state.aiPromptMaterials.length > 0) {
          state.savedAIMaterialsByImage[imageKey] = [...state.aiPromptMaterials];
        }
      }
      
      state.aiPromptMaterials = [];
    },

    // WebSocket-specific reducers
    setMaskGenerationProcessing: (state, action: PayloadAction<{ inputImageId: number; type?: string }>) => {
      const { inputImageId } = action.payload;
      state.maskStatus = 'processing';
      state.loading = true;
      state.error = null;
      console.log(`🚀 Mask generation processing started for image ${inputImageId}`);
    },
    setMaskGenerationComplete: (state, action: PayloadAction<{
      maskCount: number;
      masks: MaskRegion[];
    }>) => {
      state.loading = false;
      state.maskStatus = 'completed';
      // Replace masks (don't append) - WebSocket notifications should replace, not append
      state.masks = action.payload.masks;
      state.error = null;
      
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
    },
    
    setMaskGenerationFailed: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.maskStatus = 'failed';
      state.error = action.payload;
    },

    // AI Prompt Materials reducers
    clearAIPromptError: (state) => {
      state.aiPromptError = null;
    },
    // Restore saved prompt from generated image settings
    restoreSavedPrompt: (state, action: PayloadAction<string>) => {
      state.savedPrompt = action.payload;
    },

    // Set saved prompt for generation
    setSavedPrompt: (state, action: PayloadAction<string>) => {
      state.savedPrompt = action.payload;
    },

    clearSavedPrompt: (state) => {
      state.savedPrompt = null;
    },

    // Redux-only actions for material selection (no DB save)
    updateMaskStyleLocal: (state, action: PayloadAction<{
      maskId: number;
      materialOptionId?: number;
      customizationOptionId?: number;
      customText?: string;
      subCategoryId?: number;
    }>) => {
      const { maskId, materialOptionId, customizationOptionId, customText, subCategoryId } = action.payload;
      
      // Find and update the mask in local state only
      const maskIndex = state.masks.findIndex(mask => mask.id === maskId);
      if (maskIndex !== -1) {
        const mask = state.masks[maskIndex];
        
        // Update mask with new selections (locally only)
        state.masks[maskIndex] = {
          ...mask,
          customText,
          materialOption: materialOptionId ? {
            id: materialOptionId,
            displayName: customText || '',
            // These will be filled when we save to DB
            thumbnailUrl: state.maskInputs[maskId]?.imageUrl || undefined,
            imageUrl: state.maskInputs[maskId]?.imageUrl || undefined,
          } : undefined,
          customizationOption: customizationOptionId ? {
            id: customizationOptionId,
            displayName: customText || '',
            thumbnailUrl: state.maskInputs[maskId]?.imageUrl || undefined,
            imageUrl: state.maskInputs[maskId]?.imageUrl || undefined,
          } : undefined,
          subCategory: subCategoryId ? {
            id: subCategoryId,
            name: 'temp', // Will be updated when saved to DB
            displayName: 'Temp',
            slug: 'temp'
          } : undefined
        };
        
      }
    },

    // Redux-only action for AI material selection (no DB save)
    addAIPromptMaterialLocal: (state, action: PayloadAction<{
      inputImageId: number;
      materialOptionId?: number;
      customizationOptionId?: number;
      subCategoryId: number;
      displayName: string;
      subCategoryName: string;
      imageUrl?: string;
    }>) => {
      const { inputImageId, materialOptionId, customizationOptionId, subCategoryId, displayName, subCategoryName, imageUrl } = action.payload;
      
      // Check if exact same material already exists
      const exactMatch = state.aiPromptMaterials.find(m => 
        m.subCategoryId === subCategoryId && 
        (m.materialOptionId || null) === (materialOptionId || null) &&
        (m.customizationOptionId || null) === (customizationOptionId || null) &&
        m.displayName === displayName
      );

      // If exact same material exists, don't add it
      if (exactMatch) {
        return;
      }

      // Create a temporary material object for local state
      const tempId = -Date.now(); // Use negative timestamp to distinguish from real IDs
      const tempMaterial: AIPromptMaterial = {
        id: tempId,
        inputImageId,
        materialOptionId,
        customizationOptionId,
        subCategoryId,
        displayName,
        subCategory: {
          id: subCategoryId,
          name: subCategoryName.toLowerCase(),
          displayName: subCategoryName,
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

      // Add the new material to local state only
      state.aiPromptMaterials.push(tempMaterial);
    },

    // Redux-only action for updating mask visibility (no DB save)
    updateMaskVisibilityLocal: (state, action: PayloadAction<{
      maskId: number;
      isVisible: boolean;
    }>) => {
      const { maskId, isVisible } = action.payload;
      
      // Find and update the mask visibility in local state only
      const maskIndex = state.masks.findIndex(mask => mask.id === maskId);
      if (maskIndex !== -1) {
        state.masks[maskIndex] = {
          ...state.masks[maskIndex],
          isVisible
        };
        
      }
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
        const payload = action.payload.data;
        state.maskStatus = payload.status || payload.maskStatus || 'processing';
        
        // If masks are returned in the response (already exist or generated synchronously), populate them
        if (payload.maskRegions && Array.isArray(payload.maskRegions) && payload.maskRegions.length > 0) {
          // Replace masks (don't append) when they're returned from the API
          state.masks = payload.maskRegions;
          state.maskStatus = 'completed';
          
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
        }
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
      // Update mask visibility
      .addCase(updateMaskVisibility.fulfilled, (state, action) => {
        const updatedMask = action.payload.data;
        const index = state.masks.findIndex(mask => mask.id === updatedMask.id);
        if (index !== -1) {
          state.masks[index] = {
            ...state.masks[index],
            isVisible: updatedMask.isVisible
          };
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
      // NEW: InputImage saved prompt handlers
      .addCase(getInputImageSavedPrompt.fulfilled, (state, action) => {
        state.savedPrompt = action.payload.data.generatedPrompt;
      })
      .addCase(getInputImageSavedPrompt.rejected, (state) => {
        // If no saved prompt exists, set to null to trigger default prompt
        state.savedPrompt = null;
      })
      // NEW: Generated Image saved prompt handlers  
      .addCase(getGeneratedImageSavedPrompt.fulfilled, (state, action) => {
        state.savedPrompt = action.payload.data.aiPrompt;
      })
      .addCase(getGeneratedImageSavedPrompt.rejected, (state) => {
        // If no saved prompt exists, set to null to trigger default prompt
        state.savedPrompt = null;
      })
      // LEGACY: Keep old handlers for backward compatibility
      .addCase(getSavedPrompt.fulfilled, (state, action) => {
        state.savedPrompt = action.payload.data.generatedPrompt;
      })
      .addCase(getSavedPrompt.rejected, (state) => {
        // If no saved prompt exists, set to null to trigger default prompt
        state.savedPrompt = null;
      })
      // Save all configurations
      .addCase(saveAllConfigurationsToDatabase.fulfilled, (state) => {
        // Update mask regions to reflect saved user input
        state.masks = state.masks.map(mask => {
          const userInput = state.maskInputs[mask.id]?.displayName?.trim();
          if (userInput) {
            return {
              ...mask,
              customText: userInput
            };
          }
          return mask;
        });
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
  restoreMaskMaterialMappings,
  restoreAIMaterials,
  restoreSavedPrompt,
  setSavedPrompt,
  clearMaskMaterialSelections,
  clearAIMaterials,
  setMaskGenerationProcessing,
  setMaskGenerationComplete,
  setMaskGenerationFailed,
  clearAIPromptError,
  clearSavedPrompt,
  setAIPromptMaterial,
  removeAIPromptMaterialLocal,
  updateMaskStyleLocal,
  addAIPromptMaterialLocal,
  updateMaskVisibilityLocal,
  saveCurrentAIMaterials,
  restoreAIMaterialsForImage
} = maskSlice.actions;

// Note: getInputImageSavedPrompt and getGeneratedImageSavedPrompt are already exported above as createAsyncThunk functions

export default maskSlice.reducer;