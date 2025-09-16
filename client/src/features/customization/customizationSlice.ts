import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { REFINE_SLIDER_CONFIGS, CREATE_SLIDER_CONFIGS } from '@/constants/editInspectorSliders';

export interface CustomizationOption {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface CustomizationSelections {
  type?: string;
  walls?: any;
  floors?: any;
  context?: any;
  style?: string;
  weather?: string;
  lighting?: string;
  illustration?: string;
  pen_and_ink?: string;
  aquarelle?: string;
  linocut?: string;
  collage?: string;
  fine_black_pen?: string;
  minimalist?: string;
  avantgarde?: string;
  [key: string]: any; // Allow string keys
}

// Define specific types for expanded sections
interface PhotorealisticExpandedSections {
  type: boolean;
  walls: boolean;
  floors: boolean;
  context: boolean;
  style: boolean;
  weather: boolean;
  lighting: boolean;
  advanced: boolean;
}

interface ArtExpandedSections {
  illustration: boolean;
  pen_and_ink: boolean;
  aquarelle: boolean;
  linocut: boolean;
  collage: boolean;
  fine_black_pen: boolean;
  minimalist: boolean;
  avantgarde: boolean;
  advanced: boolean;
}

interface CustomizationState {
  selectedStyle: 'photorealistic' | 'art';
  variations: number;
  creativity: number;
  expressivity: number;
  resemblance: number;
  dynamics: number;
  fractality: number;
  selections: CustomizationSelections;
  expandedSections: {
    photorealistic: PhotorealisticExpandedSections;
    art: ArtExpandedSections;
  };
  availableOptions: any;
  optionsLoading: boolean;
  settingsLoading: boolean; // Separate loading state for settings when switching images
  error: string | null;
  inputImageId?: number; // Original input image ID for generated images
  
  // Generated image context
  selectedImageId?: number; // Currently selected image ID (input or generated)
  isGeneratedImage?: boolean; // Whether currently selected image is generated
  maskMaterialMappings?: any; // Current mask material mappings
  contextSelection?: string; // Current context selection
  generatedPrompt?: string; // Current generated prompt
  aiMaterials?: any[]; // Current AI materials
}

const initialState: CustomizationState = {
  selectedStyle: 'photorealistic',
  variations: 1,
  creativity: CREATE_SLIDER_CONFIGS.creativity.default,
  expressivity: CREATE_SLIDER_CONFIGS.expressivity.default,
  resemblance: CREATE_SLIDER_CONFIGS.resemblance.default,
  dynamics: CREATE_SLIDER_CONFIGS.dynamics.default,
  fractality: CREATE_SLIDER_CONFIGS.fractality.default,
  selections: {},
  expandedSections: {
    photorealistic: {
      type: true,
      walls: false,
      floors: false,
      context: false,
      style: false,
      weather: false,
      lighting: false,
      advanced: false,
    },
    art: {
      illustration: true,
      pen_and_ink: false,
      aquarelle: false,
      linocut: false,
      collage: false,
      fine_black_pen: false,
      minimalist: false,
      avantgarde: false,
      advanced: false,
    }
  },
  availableOptions: null,
  optionsLoading: false,
  settingsLoading: false,
  error: null,
  inputImageId: undefined,
  selectedImageId: undefined,
  isGeneratedImage: false,
  maskMaterialMappings: undefined,
  contextSelection: undefined,
  generatedPrompt: undefined,
  aiMaterials: undefined,
};

// Fetch customization options
export const fetchCustomizationOptions = createAsyncThunk(
  'customization/fetchOptions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/customization/options');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customization options');
    }
  }
);

// Generate image with current settings
export const generateImageWithSettings = createAsyncThunk(
  'customization/generateImage',
  async (params: {
    prompt: string;
    inputImageId: string;
    customizationSettings: any;
    variations: number;
  }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { customization: CustomizationState };
      
      const payload = {
        ...params,
        customizationSettings: {
          selectedStyle: state.customization.selectedStyle,
          creativity: state.customization.creativity,
          expressivity: state.customization.expressivity,
          resemblance: state.customization.resemblance,
          dynamics: state.customization.dynamics,
          fractality: state.customization.fractality,
          selections: state.customization.selections,
          ...params.customizationSettings
        }
      };
      
      const response = await api.post('/generation/create', payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate image');
    }
  }
);

export const loadBatchSettings = createAsyncThunk(
  'customization/loadBatchSettings',
  async (batchId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customization/batch/${batchId}/settings`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load batch settings');
    }
  }
);

// Load settings from a specific generated image
export const loadImageSettings = createAsyncThunk(
  'customization/loadImageSettings',
  async (imageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customization/image/${imageId}/settings`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load image settings');
    }
  }
);

const customizationSlice = createSlice({
  name: 'customization',
  initialState,
  reducers: {
    setSelectedStyle: (state, action: PayloadAction<'photorealistic' | 'art'>) => {
      state.selectedStyle = action.payload;
      state.selections = {};
    },
    
    setVariations: (state, action: PayloadAction<number>) => {
      state.variations = action.payload;
    },
    
    setCreativity: (state, action: PayloadAction<number>) => {
      state.creativity = action.payload;
    },
    
    setExpressivity: (state, action: PayloadAction<number>) => {
      state.expressivity = action.payload;
    },
    
    setResemblance: (state, action: PayloadAction<number>) => {
      state.resemblance = action.payload;
    },
    
    setDynamics: (state, action: PayloadAction<number>) => {
      state.dynamics = action.payload;
    },
    
    setFractality: (state, action: PayloadAction<number>) => {
      state.fractality = action.payload;
    },
    
    setSelection: (state, action: PayloadAction<{ category: string; value: any }>) => {
      state.selections[action.payload.category] = action.payload.value;
    },
    
    toggleSection: (state, action: PayloadAction<string>) => {
      const sectionToToggle = action.payload;
      const currentStyle = state.selectedStyle;
      
      if (currentStyle === 'photorealistic') {
        const currentSections = state.expandedSections.photorealistic;
        if (currentSections[sectionToToggle as keyof PhotorealisticExpandedSections]) {
          currentSections[sectionToToggle as keyof PhotorealisticExpandedSections] = false;
        } else {
          // Close all sections first
          Object.keys(currentSections).forEach(key => {
            currentSections[key as keyof PhotorealisticExpandedSections] = false;
          });
          // Open the requested section
          currentSections[sectionToToggle as keyof PhotorealisticExpandedSections] = true;
        }
      } else {
        const currentSections = state.expandedSections.art;
        if (currentSections[sectionToToggle as keyof ArtExpandedSections]) {
          currentSections[sectionToToggle as keyof ArtExpandedSections] = false;
        } else {
          // Close all sections first
          Object.keys(currentSections).forEach(key => {
            currentSections[key as keyof ArtExpandedSections] = false;
          });
          // Open the requested section
          currentSections[sectionToToggle as keyof ArtExpandedSections] = true;
        }
      }
    },
    
    resetSettings: (state) => {
      // Reset to CREATE page initial state values
      state.selectedStyle = 'photorealistic';
      state.variations = 1;
      state.creativity = CREATE_SLIDER_CONFIGS.creativity.default;
      state.expressivity = CREATE_SLIDER_CONFIGS.expressivity.default;
      state.resemblance = CREATE_SLIDER_CONFIGS.resemblance.default;
      state.dynamics = CREATE_SLIDER_CONFIGS.dynamics.default;
      state.fractality = CREATE_SLIDER_CONFIGS.fractality.default;
      state.selections = {};
      state.inputImageId = undefined;
      
      // Reset expanded sections to initial state
      state.expandedSections = {
        photorealistic: {
          type: true,
          walls: false,
          floors: false,
          context: false,
          style: false,
          weather: false,
          lighting: false,
          advanced: false,
        },
        art: {
          illustration: true,
          pen_and_ink: false,
          aquarelle: false,
          linocut: false,
          collage: false,
          fine_black_pen: false,
          minimalist: false,
          avantgarde: false,
          advanced: false,
        }
      };
      
      // Clear generated image specific data
      state.selectedImageId = undefined;
      state.isGeneratedImage = false;
      state.maskMaterialMappings = undefined;
      state.contextSelection = undefined;
      state.generatedPrompt = undefined;
      state.aiMaterials = undefined;
    },

    initializeCreateSettings: (state) => {
      // Initialize with Create-specific defaults
      state.selectedStyle = 'photorealistic';
      state.variations = 1;
      state.creativity = CREATE_SLIDER_CONFIGS.creativity.default;
      state.expressivity = CREATE_SLIDER_CONFIGS.expressivity.default;
      state.resemblance = CREATE_SLIDER_CONFIGS.resemblance.default;
      state.dynamics = CREATE_SLIDER_CONFIGS.dynamics.default;
      state.fractality = CREATE_SLIDER_CONFIGS.fractality.default;
      state.selections = {};
      state.inputImageId = undefined;
      
      // Reset expanded sections to initial state
      state.expandedSections = {
        photorealistic: {
          type: true,
          walls: false,
          floors: false,
          context: false,
          style: false,
          weather: false,
          lighting: false,
          advanced: false,
        },
        art: {
          illustration: true,
          pen_and_ink: false,
          aquarelle: false,
          linocut: false,
          collage: false,
          fine_black_pen: false,
          minimalist: false,
          avantgarde: false,
          advanced: false,
        }
      };
      
      // Clear generated image specific data
      state.selectedImageId = undefined;
      state.isGeneratedImage = false;
      state.maskMaterialMappings = undefined;
      state.contextSelection = undefined;
      state.generatedPrompt = undefined;
      state.aiMaterials = undefined;
    },

    initializeRefineSettings: (state) => {
      // Initialize with refine-specific defaults
      state.selectedStyle = 'photorealistic';
      state.variations = 1;
      state.creativity = REFINE_SLIDER_CONFIGS.creativity.default;
      state.expressivity = CREATE_SLIDER_CONFIGS.expressivity.default; // Use CREATE config as fallback
      state.resemblance = REFINE_SLIDER_CONFIGS.resemblance.default;
      state.dynamics = REFINE_SLIDER_CONFIGS.dynamics.default;
      state.fractality = REFINE_SLIDER_CONFIGS.fractality.default;
      state.selections = {};
      state.inputImageId = undefined;
      
      // Reset expanded sections to initial state
      state.expandedSections = {
        photorealistic: {
          type: true,
          walls: false,
          floors: false,
          context: false,
          style: false,
          weather: false,
          lighting: false,
          advanced: false,
        },
        art: {
          illustration: true,
          pen_and_ink: false,
          aquarelle: false,
          linocut: false,
          collage: false,
          fine_black_pen: false,
          minimalist: false,
          avantgarde: false,
          advanced: false,
        }
      };
      
      // Clear generated image specific data
      state.selectedImageId = undefined;
      state.isGeneratedImage = false;
      state.maskMaterialMappings = undefined;
      state.contextSelection = undefined;
      state.generatedPrompt = undefined;
      state.aiMaterials = undefined;
    },
    
    loadSettingsFromBatch: (state, action: PayloadAction<any>) => {
      const { settings, inputImageId } = action.payload;
      
      // Save the original input image ID
      if (inputImageId) {
        state.inputImageId = inputImageId;
      }
      
      if (settings) {
        // Load UI settings
        state.selectedStyle = settings.selectedStyle || 'photorealistic';
        state.variations = settings.variations || 1;
        state.creativity = settings.creativity || CREATE_SLIDER_CONFIGS.creativity.default;
        state.expressivity = settings.expressivity || CREATE_SLIDER_CONFIGS.expressivity.default;
        state.resemblance = settings.resemblance || CREATE_SLIDER_CONFIGS.resemblance.default;
        state.dynamics = settings.dynamics || CREATE_SLIDER_CONFIGS.dynamics.default;
        state.fractality = settings.fractality || CREATE_SLIDER_CONFIGS.fractality.default;
        
        // Load selections
        if (settings.selections) {
          state.selections = {
            type: settings.selections.type,
            walls: settings.selections.walls,
            floors: settings.selections.floors,
            context: settings.selections.context,
            style: settings.selections.style,
            weather: settings.selections.weather,
            lighting: settings.selections.lighting,
            ...settings.selections
          };
        }
        
        // Load generated image specific data
        state.maskMaterialMappings = settings.maskMaterialMappings || {};
        state.contextSelection = settings.contextSelection;
        state.generatedPrompt = settings.generatedPrompt;
        state.aiMaterials = settings.aiMaterials || [];
      }
    },

    loadSettingsFromImage: (state, action: PayloadAction<any>) => {
      const { settings, inputImageId, imageId, isGeneratedImage } = action.payload;
      
      // Set current selection context
      state.selectedImageId = imageId;
      state.isGeneratedImage = isGeneratedImage;
      
      // Save the original input image ID
      if (inputImageId) {
        state.inputImageId = inputImageId;
      }
      
      if (settings) {
        // Load settings directly into main state (now editable)
        state.selectedStyle = settings.selectedStyle || 'photorealistic';
        state.variations = settings.variations || 1;
        state.creativity = settings.creativity || CREATE_SLIDER_CONFIGS.creativity.default;
        state.expressivity = settings.expressivity || CREATE_SLIDER_CONFIGS.expressivity.default;
        state.resemblance = settings.resemblance || CREATE_SLIDER_CONFIGS.resemblance.default;
        state.dynamics = settings.dynamics || CREATE_SLIDER_CONFIGS.dynamics.default;
        state.fractality = settings.fractality || CREATE_SLIDER_CONFIGS.fractality.default;
        
        // Load selections
        if (settings.selections) {
          state.selections = {
            type: settings.selections.type,
            walls: settings.selections.walls,
            floors: settings.selections.floors,
            context: settings.selections.context,
            style: settings.selections.style,
            weather: settings.selections.weather,
            lighting: settings.selections.lighting,
            ...settings.selections
          };
        }
        
        // Load generated image specific data
        state.maskMaterialMappings = settings.maskMaterialMappings || {};
        state.contextSelection = settings.contextSelection;
        state.generatedPrompt = settings.generatedPrompt;
        state.aiMaterials = settings.aiMaterials || [];
      }
    },

    // Set current selection context for input/generated images
    setImageSelection: (state, action: PayloadAction<{ imageId: number; isGeneratedImage: boolean }>) => {
      state.selectedImageId = action.payload.imageId;
      state.isGeneratedImage = action.payload.isGeneratedImage;
      
      // Clear generated image specific data when selecting input image
      if (!action.payload.isGeneratedImage) {
        state.maskMaterialMappings = undefined;
        state.contextSelection = undefined;
        state.generatedPrompt = undefined;
        state.aiMaterials = undefined;
      }
    },

    // Update mask material mapping for current image
    setMaskMaterialMapping: (state, action: PayloadAction<{ maskId: string; mapping: any }>) => {
      if (!state.maskMaterialMappings) {
        state.maskMaterialMappings = {};
      }
      state.maskMaterialMappings[action.payload.maskId] = action.payload.mapping;
    },

    // Set context selection
    setContextSelection: (state, action: PayloadAction<string>) => {
      state.contextSelection = action.payload;
    }
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomizationOptions.pending, (state) => {
        state.optionsLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomizationOptions.fulfilled, (state, action) => {
        state.optionsLoading = false;
        state.availableOptions = action.payload;
      })
      .addCase(fetchCustomizationOptions.rejected, (state, action) => {
        state.optionsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(loadBatchSettings.pending, (state) => {
        state.settingsLoading = true;
        state.error = null;
      })
      .addCase(loadBatchSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        customizationSlice.caseReducers.loadSettingsFromBatch(state, action);
      })
      .addCase(loadBatchSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(loadImageSettings.pending, (state) => {
        state.settingsLoading = true;
        state.error = null;
      })
      .addCase(loadImageSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        customizationSlice.caseReducers.loadSettingsFromImage(state, action);
      })
      .addCase(loadImageSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedStyle,
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
  setDynamics,
  setFractality,
  setSelection,
  toggleSection,
  resetSettings,
  initializeCreateSettings,
  initializeRefineSettings,
  loadSettingsFromBatch,
  loadSettingsFromImage,
  setImageSelection,
  setMaskMaterialMapping,
  setContextSelection
} = customizationSlice.actions;

export default customizationSlice.reducer;