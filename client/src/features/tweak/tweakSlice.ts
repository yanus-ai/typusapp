import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

// Types
export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectedRegion {
  id: string;
  mask: ImageData;
  bounds: CanvasBounds;
  path?: { x: number; y: number }[]; // Free-form path points (screen coordinates)
  imagePath?: { x: number; y: number }[]; // Free-form path points (normalized image coordinates 0-1)
}

export interface AddedImage {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
}

export interface RectangleObject {
  id: string;
  position: { x: number; y: number }; // normalized coordinates (0-1)
  size: { width: number; height: number }; // normalized size (0-1)
  color: string;
  strokeWidth: number;
}

export interface BrushObject {
  id: string;
  path: { x: number; y: number }[]; // normalized coordinates (0-1)
  bounds: { x: number; y: number; width: number; height: number }; // normalized bounds
  color: string;
  strokeWidth: number;
}

export interface TweakOperation {
  id: string;
  type: 'outpaint' | 'inpaint' | 'add_image' | 'prompt';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultImageUrl?: string;
}

export interface TweakState {
  // Canvas state
  canvasBounds: CanvasBounds;
  originalImageBounds: CanvasBounds;
  zoom: number;
  pan: { x: number; y: number };
  
  // Tool state
  currentTool: 'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil';
  brushSize: number;
  
  // Operations
  selectedRegions: SelectedRegion[];
  addedImages: AddedImage[];
  rectangleObjects: RectangleObject[];
  brushObjects: BrushObject[];
  operations: TweakOperation[];
  
  // Generation state
  isGenerating: boolean;
  prompt: string;
  variations: number;
  
  // UI state
  selectedBaseImageId: number | null;
  tweakHistory: any[];
  
  // Loading states
  loading: boolean;
  error: string | null;
}

const initialState: TweakState = {
  canvasBounds: { x: 0, y: 0, width: 800, height: 600 },
  originalImageBounds: { x: 0, y: 0, width: 800, height: 600 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  
  currentTool: 'select',
  brushSize: 20,
  
  selectedRegions: [],
  addedImages: [],
  rectangleObjects: [],
  brushObjects: [],
  operations: [],
  
  isGenerating: false,
  prompt: '',
  variations: 1,
  
  selectedBaseImageId: null,
  tweakHistory: [],
  
  loading: false,
  error: null,
};

// Async thunks
export const generateOutpaint = createAsyncThunk(
  'tweak/generateOutpaint',
  async (params: {
    baseImageUrl: string;
    canvasBounds: CanvasBounds;
    originalImageBounds: CanvasBounds;
    variations?: number;
    originalBaseImageId?: number; // Add support for original base image ID
  }) => {
    const response = await api.post('/tweak/outpaint', params);
    return response.data;
  }
);

export const generateInpaint = createAsyncThunk(
  'tweak/generateInpaint',
  async (params: {
    baseImageId: number;
    regions: SelectedRegion[];
    prompt: string;
    originalBaseImageId?: number; // Add support for original base image ID
  }) => {
    const response = await api.post('/tweak/inpaint', params);
    return response.data;
  }
);

export const addImageToCanvas = createAsyncThunk(
  'tweak/addImageToCanvas',
  async (params: {
    baseImageId: number;
    addedImage: File;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }) => {
    const formData = new FormData();
    formData.append('baseImageId', params.baseImageId.toString());
    formData.append('image', params.addedImage);
    formData.append('position', JSON.stringify(params.position));
    formData.append('size', JSON.stringify(params.size));
    
    const response = await api.post('/tweak/add-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
);

const tweakSlice = createSlice({
  name: 'tweak',
  initialState,
  reducers: {
    // Canvas actions
    setCanvasBounds: (state, action: PayloadAction<CanvasBounds>) => {
      state.canvasBounds = action.payload;
    },
    setOriginalImageBounds: (state, action: PayloadAction<CanvasBounds>) => {
      state.originalImageBounds = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.1, Math.min(10, action.payload));
    },
    setPan: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.pan = action.payload;
    },
    
    // Tool actions
    setCurrentTool: (state, action: PayloadAction<'select' | 'region' | 'cut' | 'add' | 'rectangle' | 'brush' | 'move' | 'pencil'>) => {
      state.currentTool = action.payload;
    },
    setBrushSize: (state, action: PayloadAction<number>) => {
      state.brushSize = action.payload;
    },
    
    // Region actions
    addSelectedRegion: (state, action: PayloadAction<SelectedRegion>) => {
      state.selectedRegions.push(action.payload);
    },
    updateSelectedRegion: (state, action: PayloadAction<{id: string, updates: Partial<SelectedRegion>}>) => {
      const regionIndex = state.selectedRegions.findIndex(region => region.id === action.payload.id);
      if (regionIndex !== -1) {
        state.selectedRegions[regionIndex] = { ...state.selectedRegions[regionIndex], ...action.payload.updates };
      }
    },
    removeSelectedRegion: (state, action: PayloadAction<string>) => {
      state.selectedRegions = state.selectedRegions.filter(region => region.id !== action.payload);
    },
    clearSelectedRegions: (state) => {
      state.selectedRegions = [];
    },
    
    // Added images actions
    addImageToState: (state, action: PayloadAction<AddedImage>) => {
      state.addedImages.push(action.payload);
    },
    updateAddedImage: (state, action: PayloadAction<{ id: string; updates: Partial<AddedImage> }>) => {
      const index = state.addedImages.findIndex(img => img.id === action.payload.id);
      if (index !== -1) {
        state.addedImages[index] = { ...state.addedImages[index], ...action.payload.updates };
      }
    },
    removeAddedImage: (state, action: PayloadAction<string>) => {
      state.addedImages = state.addedImages.filter(img => img.id !== action.payload);
    },
    
    // Rectangle object actions
    addRectangleObject: (state, action: PayloadAction<RectangleObject>) => {
      state.rectangleObjects.push(action.payload);
    },
    updateRectangleObject: (state, action: PayloadAction<{ id: string; updates: Partial<RectangleObject> }>) => {
      const index = state.rectangleObjects.findIndex(rect => rect.id === action.payload.id);
      if (index !== -1) {
        state.rectangleObjects[index] = { ...state.rectangleObjects[index], ...action.payload.updates };
      }
    },
    removeRectangleObject: (state, action: PayloadAction<string>) => {
      state.rectangleObjects = state.rectangleObjects.filter(rect => rect.id !== action.payload);
    },
    
    // Brush object actions
    addBrushObject: (state, action: PayloadAction<BrushObject>) => {
      state.brushObjects.push(action.payload);
    },
    updateBrushObject: (state, action: PayloadAction<{ id: string; updates: Partial<BrushObject> }>) => {
      const index = state.brushObjects.findIndex(brush => brush.id === action.payload.id);
      if (index !== -1) {
        state.brushObjects[index] = { ...state.brushObjects[index], ...action.payload.updates };
      }
    },
    removeBrushObject: (state, action: PayloadAction<string>) => {
      state.brushObjects = state.brushObjects.filter(brush => brush.id !== action.payload);
    },
    
    // Operation actions
    addOperation: (state, action: PayloadAction<TweakOperation>) => {
      state.operations.push(action.payload);
    },
    updateOperation: (state, action: PayloadAction<{ id: string; updates: Partial<TweakOperation> }>) => {
      const index = state.operations.findIndex(op => op.id === action.payload.id);
      if (index !== -1) {
        state.operations[index] = { ...state.operations[index], ...action.payload.updates };
      }
    },
    
    // Generation actions
    setPrompt: (state, action: PayloadAction<string>) => {
      state.prompt = action.payload;
    },
    setVariations: (state, action: PayloadAction<number>) => {
      state.variations = Math.max(1, Math.min(2, action.payload)); // Clamp between 1 and 2
    },
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    
    // Base image actions
    setSelectedBaseImageId: (state, action: PayloadAction<number | null>) => {
      state.selectedBaseImageId = action.payload;
      // Reset canvas state when changing base image
      state.selectedRegions = [];
      state.addedImages = [];
      state.rectangleObjects = [];
      state.brushObjects = [];
      state.operations = [];
    },
    
    // Reset actions
    resetTweakState: (state) => {
      return { ...initialState, selectedBaseImageId: state.selectedBaseImageId };
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate outpaint
      .addCase(generateOutpaint.pending, (state) => {
        state.loading = true;
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateOutpaint.fulfilled, (state, action) => {
        state.loading = false;
        // Keep isGenerating true - will be reset by WebSocket updates
        // Add operation to track the outpaint
        const operation: TweakOperation = {
          id: Date.now().toString(),
          type: 'outpaint',
          data: action.meta.arg,
          status: 'processing',
        };
        state.operations.push(operation);
      })
      .addCase(generateOutpaint.rejected, (state, action) => {
        state.loading = false;
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate outpaint';
      })
      
      // Generate inpaint
      .addCase(generateInpaint.pending, (state) => {
        state.loading = true;
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateInpaint.fulfilled, (state, action) => {
        state.loading = false;
        // Keep isGenerating true - will be reset by WebSocket updates
        const operation: TweakOperation = {
          id: Date.now().toString(),
          type: 'inpaint',
          data: action.meta.arg,
          status: 'processing',
        };
        state.operations.push(operation);
      })
      .addCase(generateInpaint.rejected, (state, action) => {
        state.loading = false;
        state.isGenerating = false;
        state.error = action.error.message || 'Failed to generate inpaint';
      })
      
      // Add image to canvas
      .addCase(addImageToCanvas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addImageToCanvas.fulfilled, (state) => {
        state.loading = false;
        // The added image will be handled by the addImageToState action
      })
      .addCase(addImageToCanvas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add image';
      });
  },
});

export const {
  setCanvasBounds,
  setOriginalImageBounds,
  setZoom,
  setPan,
  setCurrentTool,
  setBrushSize,
  addSelectedRegion,
  updateSelectedRegion,
  removeSelectedRegion,
  clearSelectedRegions,
  addImageToState,
  updateAddedImage,
  removeAddedImage,
  addRectangleObject,
  updateRectangleObject,
  removeRectangleObject,
  addBrushObject,
  updateBrushObject,
  removeBrushObject,
  addOperation,
  updateOperation,
  setPrompt,
  setVariations,
  setIsGenerating,
  setSelectedBaseImageId,
  resetTweakState,
} = tweakSlice.actions;

export default tweakSlice.reducer;