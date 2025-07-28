import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

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
}

interface CustomizationState {
  selectedStyle: 'photorealistic' | 'art';
  variations: number;
  creativity: number;
  expressivity: number;
  resemblance: number;
  selections: CustomizationSelections;
  expandedSections: {
    photorealistic: PhotorealisticExpandedSections;
    art: ArtExpandedSections;
  };
  availableOptions: any;
  optionsLoading: boolean;
  error: string | null;
  inputImageId?: number; // Original input image ID for generated images
}

const initialState: CustomizationState = {
  selectedStyle: 'photorealistic',
  variations: 1,
  creativity: 3,
  expressivity: 2,
  resemblance: 3,
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
    }
  },
  availableOptions: null,
  optionsLoading: false,
  error: null,
  inputImageId: undefined,
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
      const response = await api.get(`/runpod/batch/${batchId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load batch settings');
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
      state.selections = {};
      state.creativity = 3;
      state.expressivity = 3;
      state.resemblance = 3;
      state.variations = 3;
      state.inputImageId = undefined;
    },
    
    loadSettingsFromBatch: (state, action: PayloadAction<any>) => {
      const { createSettings, inputImageId } = action.payload;
      
      // Save the original input image ID
      if (inputImageId) {
        state.inputImageId = inputImageId;
      }
      
      if (createSettings) {
        state.selectedStyle = createSettings.mode || 'photorealistic';
        state.variations = createSettings.variations || 3;
        state.creativity = createSettings.creativity || 3;
        state.expressivity = createSettings.expressivity || 3;
        state.resemblance = createSettings.resemblance || 3;
        
        state.selections = {
          type: createSettings.buildingType,
          walls: createSettings.category ? {
            category: createSettings.category,
            option: createSettings.regions?.walls?.option
          } : undefined,
          context: createSettings.context,
          style: createSettings.style,
          ...createSettings.regions
        };
      }
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
      .addCase(loadBatchSettings.fulfilled, (state, action) => {
        customizationSlice.caseReducers.loadSettingsFromBatch(state, action);
      });
  },
});

export const {
  setSelectedStyle,
  setVariations,
  setCreativity,
  setExpressivity,
  setResemblance,
  setSelection,
  toggleSection,
  resetSettings,
  loadSettingsFromBatch
} = customizationSlice.actions;

export default customizationSlice.reducer;