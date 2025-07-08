import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface CustomizationOption {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface CustomizationSelections {
  type?: string;
  walls?: {
    category: string;
    option: string;
  };
  floors?: {
    category: string;
    option: string;
  };
  context?: string;
  style?: string;
  weather?: string;
  lighting?: string;
  artStyle?: string;
}

interface CustomizationState {
  // Style selection
  selectedStyle: 'photorealistic' | 'art';
  
  // Slider values
  variations: number;
  creativity: number;
  expressivity: number;
  resemblance: number;
  
  // Customization selections
  selections: CustomizationSelections;
  
  // UI state
  expandedSections: {
    type: boolean;
    walls: boolean;
    floors: boolean;
    context: boolean;
    style: boolean;
    weather: boolean;
    lighting: boolean;
  };
  
  // Available options (loaded from API)
  availableOptions: any;
  optionsLoading: boolean;
  optionsError: string | null;
}

const initialState: CustomizationState = {
  selectedStyle: 'photorealistic',
  variations: 3,
  creativity: 3,
  expressivity: 3,
  resemblance: 3,
  selections: {},
  expandedSections: {
    type: false,
    walls: false,
    floors: false,
    context: false,
    style: false,
    weather: false,
    lighting: false,
  },
  availableOptions: null,
  optionsLoading: false,
  optionsError: null,
};

// Async thunks
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
  async (batchId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/generation/batch/${batchId}`);
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
      // Reset selections when switching styles
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
      state.selections[action.payload.category as keyof CustomizationSelections] = action.payload.value;
    },
    
    toggleSection: (state, action: PayloadAction<string>) => {
      const section = action.payload as keyof typeof state.expandedSections;
      state.expandedSections[section] = !state.expandedSections[section];
    },
    
    resetSettings: (state) => {
      state.selections = {};
      state.creativity = 3;
      state.expressivity = 3;
      state.resemblance = 3;
      state.variations = 3;
    },
    
    loadSettingsFromBatch: (state, action: PayloadAction<any>) => {
      const { createSettings } = action.payload;
      if (createSettings) {
        state.selectedStyle = createSettings.mode || 'photorealistic';
        state.variations = createSettings.variations || 3;
        state.creativity = createSettings.creativity || 3;
        state.expressivity = createSettings.expressivity || 3;
        state.resemblance = createSettings.resemblance || 3;
        
        // Reconstruct selections from saved settings
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
      // Fetch customization options
      .addCase(fetchCustomizationOptions.pending, (state) => {
        state.optionsLoading = true;
        state.optionsError = null;
      })
      .addCase(fetchCustomizationOptions.fulfilled, (state, action) => {
        state.optionsLoading = false;
        state.availableOptions = action.payload;
      })
      .addCase(fetchCustomizationOptions.rejected, (state, action) => {
        state.optionsLoading = false;
        state.optionsError = action.payload as string;
      })
      
      // Load batch settings
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