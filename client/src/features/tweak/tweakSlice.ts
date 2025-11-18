import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import {
  autoExtendCanvasBounds,
  detectOperationType,
  OutpaintOperationType,
  IntensityLevel,
} from "@/utils/canvasExpansionPredictor";

// Enhanced types for tweak functionality
export interface TweakGeneratedImage {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  batchId?: number;
  variationNumber?: number;
  runpodStatus?: string;
  aiPrompt?: string;
  settingsSnapshot?: any;
}

// Types
export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Define the image type enum
export type ImageType =
  | "TWEAK_UPLOADED"
  | "CREATE_GENERATED"
  | "TWEAK_GENERATED";

// Interface for tracking selected image context
export interface SelectedImageContext {
  imageId: number | null;
  imageType: ImageType | null;
  source: "input" | "create" | "tweak" | null; // Which panel/source it came from
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
  type: "outpaint" | "inpaint" | "add_image" | "prompt";
  data: any;
  status: "pending" | "processing" | "completed" | "failed";
  resultImageUrl?: string;
}

export interface HistoryState {
  selectedRegions: SelectedRegion[];
  rectangleObjects: RectangleObject[];
  brushObjects: BrushObject[];
  addedImages: AddedImage[];
}

export interface TweakState {
  // Canvas state
  canvasBounds: CanvasBounds;
  originalImageBounds: CanvasBounds;
  zoom: number;
  pan: { x: number; y: number };

  // Tool state
  currentTool:
    | "select"
    | "region"
    | "cut"
    | "add"
    | "rectangle"
    | "brush"
    | "move"
    | "pencil"
    | "editByText";

  brushSize: number;

  // Operations
  selectedRegions: SelectedRegion[];
  addedImages: AddedImage[];
  rectangleObjects: RectangleObject[];
  brushObjects: BrushObject[];
  operations: TweakOperation[];

  // Generation state
  isGenerating: boolean;
  generatingBatchId: number | undefined;
  generatingInputImageId: number | undefined;
  generatingInputImagePreviewUrl: string | undefined;
  prompt: string;
  variations: number;
  selectedModel: string;

  // UI state
  selectedBaseImageId: number | null;
  selectedImageContext: SelectedImageContext; // NEW: Track image type and source
  tweakHistory: any[];

  // History state for undo/redo
  history: HistoryState[];
  historyIndex: number;

  // Loading states
  loading: boolean;
  error: string | null;

  // Timeout and retry state
  showCanvasSpinner: boolean;
  retryInProgress: boolean;
  timeoutPhase: "none" | "canvas_hidden" | "retry_triggered" | "final_failure";
  retryAttempts: number;
  generationStartTime: number | null;
  runKonectFlux: any;
}

const initialHistoryState: HistoryState = {
  selectedRegions: [],
  rectangleObjects: [],
  brushObjects: [],
  addedImages: [],
};

const initialState: TweakState = {
  canvasBounds: { x: 0, y: 0, width: 800, height: 600 },
  originalImageBounds: { x: 0, y: 0, width: 800, height: 600 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  currentTool: "editByText",
  brushSize: 60,

  selectedRegions: [],
  addedImages: [],
  rectangleObjects: [],
  brushObjects: [],
  operations: [],

  isGenerating: false,
  generatingBatchId: undefined,
  generatingInputImageId: undefined,
  generatingInputImagePreviewUrl: undefined,
  prompt: "",
  variations: 1,
  selectedModel: "nanobanana",

  selectedBaseImageId: null,
  selectedImageContext: {
    imageId: null,
    imageType: null,
    source: null,
  },
  tweakHistory: [],

  history: [initialHistoryState],
  historyIndex: 0,

  loading: false,
  error: null,

  // Timeout and retry initial state
  showCanvasSpinner: true,
  retryInProgress: false,
  timeoutPhase: "none",
  retryAttempts: 0,
  generationStartTime: null,
  runKonectFlux: null,
};

// Async thunks
export const generateOutpaint = createAsyncThunk(
  "tweak/generateOutpaint",
  async (params: {
    prompt: string;
    baseImageUrl: string;
    canvasBounds: CanvasBounds;
    originalImageBounds: CanvasBounds;
    variations?: number;
    originalBaseImageId?: number; // Add support for original base image ID
    selectedBaseImageId?: number; // Track what the frontend was subscribed to
    outpaintOption?: string;
  }) => {
    const response = await api.post("/tweak/outpaint", params);
    return response.data;
  }
);

export const generateInpaint = createAsyncThunk(
  "tweak/generateInpaint",
  async (params: {
    baseImageUrl: string;
    maskImageUrl: string;
    prompt: string;
    negativePrompt?: string;
    maskKeyword?: string;
    variations?: number;
    originalBaseImageId?: number; // Add support for original base image ID
    selectedBaseImageId?: number; // Track what the frontend was subscribed to
  }) => {
    const response = await api.post("/tweak/inpaint", params);
    return response.data;
  }
);

export const addImageToCanvas = createAsyncThunk(
  "tweak/addImageToCanvas",
  async (params: {
    baseImageId: number;
    addedImage: File;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }) => {
    const formData = new FormData();
    formData.append("baseImageId", params.baseImageId.toString());
    formData.append("image", params.addedImage);
    formData.append("position", JSON.stringify(params.position));
    formData.append("size", JSON.stringify(params.size));

    const response = await api.post("/tweak/add-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
);

// 🔥 NEW: Create InputImage from tweak generated image - for "Create Again" functionality
export const createInputImageFromTweakGenerated = createAsyncThunk(
  "tweak/createInputImageFromTweakGenerated",
  async (params: {
    generatedImageUrl: string;
    generatedThumbnailUrl?: string;
    originalInputImageId: number;
    fileName: string;
    tweakSettings?: any;
  }) => {
    const response = await api.post("/tweak/create-input-from-generated", {
      generatedImageUrl: params.generatedImageUrl,
      generatedThumbnailUrl: params.generatedThumbnailUrl,
      originalInputImageId: params.originalInputImageId,
      fileName: params.fileName,
      tweakSettings: params.tweakSettings,
      uploadSource: "TWEAK_MODULE",
    });

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          "Failed to create input image from tweak result"
      );
    }

    return response.data.data;
  }
);

// 🔥 NEW: Save prompt to InputImage for tweak module (similar to Create module)
export const saveTweakPrompt = createAsyncThunk(
  "tweak/saveTweakPrompt",
  async (
    { inputImageId, prompt }: { inputImageId: number; prompt: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/ai-prompt/prompt/${inputImageId}`, {
        prompt,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to save tweak prompt"
      );
    }
  }
);

// 🔥 NEW: Load prompt from InputImage for tweak module (using correct endpoint)
export const loadTweakPrompt = createAsyncThunk(
  "tweak/loadTweakPrompt",
  async (inputImageId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/ai-prompt/input-image-prompt/${inputImageId}`
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load tweak prompt"
      );
    }
  }
);

export const runFluxKonect = createAsyncThunk(
  "tweak/runFluxKonect",
  async (
    params: {
      prompt: string;
      imageUrl?: string;
      variations?: number;
      model?: string;
      originalBaseImageId?: number;
      selectedBaseImageId?: number;
      existingBatchId?: number;
      moduleType?: 'TWEAK' | 'CREATE';
      referenceImageUrl?: string;
      referenceImageUrls?: string[];
      textureUrls?: string[];
      surroundingUrls?: string[];
      wallsUrls?: string[];
      baseAttachmentUrl?: string;
      size?: string;
      aspectRatio?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/flux-model/run", {
        prompt: params.prompt,
        imageUrl: params.imageUrl,
        variations: params.variations || 1,
        model: params.model || 'flux-konect',
        originalBaseImageId: params.originalBaseImageId,
        selectedBaseImageId: params.selectedBaseImageId,
        existingBatchId: params.existingBatchId,
        moduleType: params.moduleType,
        referenceImageUrl: params.referenceImageUrl,
        referenceImageUrls: params.referenceImageUrls,
        textureUrls: params.textureUrls,
        surroundingUrls: params.surroundingUrls,
        wallsUrls: params.wallsUrls,
        baseAttachmentUrl: params.baseAttachmentUrl,
        size: params.size,
        aspectRatio: params.aspectRatio,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data || "Failed to generate"
      );
    }
  }
);

// Helper function to save current state to history
const saveToHistory = (state: TweakState) => {
  const currentHistoryState: HistoryState = {
    selectedRegions: [...state.selectedRegions],
    rectangleObjects: [...state.rectangleObjects],
    brushObjects: [...state.brushObjects],
    addedImages: [...state.addedImages],
  };

  // Remove any future history if we're not at the end
  state.history = state.history.slice(0, state.historyIndex + 1);

  // Add new state to history
  state.history.push(currentHistoryState);

  // Limit history size to 50 entries
  if (state.history.length > 50) {
    state.history = state.history.slice(-50);
    state.historyIndex = 49;
  } else {
    state.historyIndex = state.history.length - 1;
  }
};

// Helper function to restore state from history
const restoreFromHistory = (state: TweakState, historyState: HistoryState) => {
  state.selectedRegions = [...historyState.selectedRegions];
  state.rectangleObjects = [...historyState.rectangleObjects];
  state.brushObjects = [...historyState.brushObjects];
  state.addedImages = [...historyState.addedImages];
};

const tweakSlice = createSlice({
  name: "tweak",
  initialState,
  reducers: {
    // Canvas actions
    setCanvasBounds: (state, action: PayloadAction<CanvasBounds>) => {
      state.canvasBounds = action.payload;
    },
    setOriginalImageBounds: (state, action: PayloadAction<CanvasBounds>) => {
      state.originalImageBounds = action.payload;
    },

    // 🔮 Automatic canvas expansion actions
    autoExpandCanvasForOutpaint: (
      state,
      action: PayloadAction<{
        operationType: OutpaintOperationType;
        intensity?: IntensityLevel;
      }>
    ) => {
      const { operationType, intensity } = action.payload;
      try {
        const result = autoExtendCanvasBounds(
          operationType,
          state.originalImageBounds,
          intensity
        );
        state.canvasBounds = result.canvasBounds;
        console.log("🔮 Auto-expanded canvas for outpaint:", {
          operationType,
          intensity,
          from: `${state.originalImageBounds.width}x${state.originalImageBounds.height}`,
          to: `${result.canvasBounds.width}x${result.canvasBounds.height}`,
          outpaintBounds: result.outpaintBounds,
        });
      } catch (error) {
        console.error("❌ Failed to auto-expand canvas:", error);
      }
    },

    detectAndExpandCanvas: (
      state,
      action: PayloadAction<{
        newBounds: CanvasBounds;
        tolerance?: number;
        intensity?: IntensityLevel;
      }>
    ) => {
      const { newBounds, tolerance = 5, intensity } = action.payload;
      try {
        // Detect the operation type based on how the canvas was extended
        const operationType = detectOperationType(
          state.originalImageBounds,
          newBounds,
          tolerance
        );

        if (operationType) {
          // Auto-expand using predicted standardized bounds
          const result = autoExtendCanvasBounds(
            operationType,
            state.originalImageBounds,
            intensity
          );
          state.canvasBounds = result.canvasBounds;
          console.log("🔍 Detected operation and auto-expanded canvas:", {
            detectedType: operationType,
            userBounds: newBounds,
            predictedBounds: result.canvasBounds,
            outpaintBounds: result.outpaintBounds,
          });
        } else {
          // Fallback to user's manual bounds if detection fails
          state.canvasBounds = newBounds;
          console.log(
            "⚠️ Could not detect operation type, using manual bounds"
          );
        }
      } catch (error) {
        console.error("❌ Failed to detect and expand canvas:", error);
        // Fallback to manual bounds
        state.canvasBounds = newBounds;
      }
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.1, Math.min(10, action.payload));
    },
    setPan: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.pan = action.payload;
    },

    // Tool actions
    setCurrentTool: (
      state,
      action: PayloadAction<
        | "select"
        | "region"
        | "cut"
        | "add"
        | "rectangle"
        | "brush"
        | "move"
        | "pencil"
        | "editByText"
      >
    ) => {
      state.currentTool = action.payload;
    },
    setBrushSize: (state, action: PayloadAction<number>) => {
      state.brushSize = action.payload;
    },

    // History actions
    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        const previousState = state.history[state.historyIndex];
        restoreFromHistory(state, previousState);
      }
    },
    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        const nextState = state.history[state.historyIndex];
        restoreFromHistory(state, nextState);
      }
    },

    // Region actions
    addSelectedRegion: (state, action: PayloadAction<SelectedRegion>) => {
      state.selectedRegions.push(action.payload);
      saveToHistory(state);
    },
    updateSelectedRegion: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<SelectedRegion> }>
    ) => {
      const regionIndex = state.selectedRegions.findIndex(
        (region) => region.id === action.payload.id
      );
      if (regionIndex !== -1) {
        state.selectedRegions[regionIndex] = {
          ...state.selectedRegions[regionIndex],
          ...action.payload.updates,
        };
      }
    },
    removeSelectedRegion: (state, action: PayloadAction<string>) => {
      state.selectedRegions = state.selectedRegions.filter(
        (region) => region.id !== action.payload
      );
      saveToHistory(state);
    },
    clearSelectedRegions: (state) => {
      if (state.selectedRegions.length > 0) {
        state.selectedRegions = [];
        saveToHistory(state);
      }
    },

    // Added images actions
    addImageToState: (state, action: PayloadAction<AddedImage>) => {
      state.addedImages.push(action.payload);
      saveToHistory(state);
    },
    updateAddedImage: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<AddedImage> }>
    ) => {
      const index = state.addedImages.findIndex(
        (img) => img.id === action.payload.id
      );
      if (index !== -1) {
        state.addedImages[index] = {
          ...state.addedImages[index],
          ...action.payload.updates,
        };
      }
    },
    removeAddedImage: (state, action: PayloadAction<string>) => {
      state.addedImages = state.addedImages.filter(
        (img) => img.id !== action.payload
      );
      saveToHistory(state);
    },

    // Rectangle object actions
    addRectangleObject: (state, action: PayloadAction<RectangleObject>) => {
      state.rectangleObjects.push(action.payload);
      saveToHistory(state);
    },
    updateRectangleObject: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<RectangleObject> }>
    ) => {
      const index = state.rectangleObjects.findIndex(
        (rect) => rect.id === action.payload.id
      );
      if (index !== -1) {
        state.rectangleObjects[index] = {
          ...state.rectangleObjects[index],
          ...action.payload.updates,
        };
      }
    },
    removeRectangleObject: (state, action: PayloadAction<string>) => {
      state.rectangleObjects = state.rectangleObjects.filter(
        (rect) => rect.id !== action.payload
      );
      saveToHistory(state);
    },

    // Brush object actions
    addBrushObject: (state, action: PayloadAction<BrushObject>) => {
      state.brushObjects.push(action.payload);
      saveToHistory(state);
    },
    updateBrushObject: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<BrushObject> }>
    ) => {
      const index = state.brushObjects.findIndex(
        (brush) => brush.id === action.payload.id
      );
      if (index !== -1) {
        state.brushObjects[index] = {
          ...state.brushObjects[index],
          ...action.payload.updates,
        };
      }
    },
    removeBrushObject: (state, action: PayloadAction<string>) => {
      state.brushObjects = state.brushObjects.filter(
        (brush) => brush.id !== action.payload
      );
      saveToHistory(state);
    },

    // Operation actions
    addOperation: (state, action: PayloadAction<TweakOperation>) => {
      state.operations.push(action.payload);
    },
    updateOperation: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<TweakOperation> }>
    ) => {
      const index = state.operations.findIndex(
        (op) => op.id === action.payload.id
      );
      if (index !== -1) {
        state.operations[index] = {
          ...state.operations[index],
          ...action.payload.updates,
        };
      }
    },

    // Generation actions
    setPrompt: (state, action: PayloadAction<string>) => {
      state.prompt = action.payload;
    },
    setSelectedModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },
    setVariations: (state, action: PayloadAction<number>) => {
      state.variations = Math.max(1, Math.min(4, action.payload)); // Clamp between 1 and 4
    },
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    // Generation tracking actions (same as CreatePage)
    startGeneration: (
      state,
      action: PayloadAction<{
        batchId: number;
        inputImageId: number;
        inputImagePreviewUrl: string;
      }>
    ) => {
      state.isGenerating = true;
      state.generatingBatchId = action.payload.batchId;
      state.generatingInputImageId = action.payload.inputImageId;
      state.generatingInputImagePreviewUrl =
        action.payload.inputImagePreviewUrl;
    },
    stopGeneration: (state) => {
      state.isGenerating = false;
      state.generatingBatchId = undefined;
      state.generatingInputImageId = undefined;
      state.generatingInputImagePreviewUrl = undefined;
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
      // Reset history
      state.history = [initialHistoryState];
      state.historyIndex = 0;
    },

    // Auto-select base image without resetting canvas state (for WebSocket completions)
    setSelectedBaseImageIdSilent: (
      state,
      action: PayloadAction<number | null>
    ) => {
      state.selectedBaseImageId = action.payload;
      // Don't reset canvas state - preserve user's current work
    },

    // Auto-select completed generation and clear drawn objects (for inpaint completions)
    setSelectedBaseImageIdAndClearObjects: (
      state,
      action: PayloadAction<number | null>
    ) => {
      state.selectedBaseImageId = action.payload;
      // Clear objects that were used for mask generation but preserve canvas bounds and other state
      state.selectedRegions = [];
      state.rectangleObjects = [];
      state.brushObjects = [];
      // Don't reset addedImages, operations, history, or canvas bounds - user might want to keep working
    },

    // NEW: Image context management actions
    setSelectedImageContext: (
      state,
      action: PayloadAction<SelectedImageContext>
    ) => {
      state.selectedImageContext = action.payload;
      state.selectedBaseImageId = action.payload.imageId;
    },

    setSelectedImageWithContext: (
      state,
      action: PayloadAction<{
        imageId: number;
        imageType: ImageType;
        source: "input" | "create" | "tweak";
      }>
    ) => {
      const { imageId, imageType, source } = action.payload;

      // Update both the selected image and its context
      state.selectedBaseImageId = imageId;
      state.selectedImageContext = {
        imageId,
        imageType,
        source,
      };

      // Reset canvas state when changing base image
      state.selectedRegions = [];
      state.addedImages = [];
      state.rectangleObjects = [];
      state.brushObjects = [];
      state.operations = [];
      // Reset history
      state.history = [initialHistoryState];
      state.historyIndex = 0;
    },

    updateImageType: (state, action: PayloadAction<ImageType>) => {
      if (state.selectedImageContext.imageId) {
        state.selectedImageContext.imageType = action.payload;
      }
    },

    clearImageContext: (state) => {
      state.selectedImageContext = {
        imageId: null,
        imageType: null,
        source: null,
      };
      state.selectedBaseImageId = null;
    },

    // Timeout and retry actions
    hideCanvasSpinner: (state) => {
      state.showCanvasSpinner = false;
    },
    setRetryInProgress: (state, action: PayloadAction<boolean>) => {
      state.retryInProgress = action.payload;
    },
    setTimeoutPhase: (
      state,
      action: PayloadAction<
        "none" | "canvas_hidden" | "retry_triggered" | "final_failure"
      >
    ) => {
      state.timeoutPhase = action.payload;
    },
    incrementRetryAttempts: (state) => {
      state.retryAttempts += 1;
    },
    setGenerationStartTime: (state, action: PayloadAction<number | null>) => {
      state.generationStartTime = action.payload;
    },
    resetTimeoutStates: (state) => {
      state.showCanvasSpinner = true;
      state.retryInProgress = false;
      state.timeoutPhase = "none";
      state.retryAttempts = 0;
      state.generationStartTime = null;
    },
    cancelCurrentGeneration: (state) => {
      state.isGenerating = false;
      state.showCanvasSpinner = true;
      state.retryInProgress = false;
      state.timeoutPhase = "none";
      state.retryAttempts = 0;
      state.generationStartTime = null;
      state.loading = false;
      state.error = null;
    },
    // Reset actions
    resetTweakState: (state) => {
      return {
        ...initialState,
        selectedBaseImageId: state.selectedBaseImageId,
        history: [initialHistoryState],
        historyIndex: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate outpaint
      .addCase(generateOutpaint.pending, (state) => {
        state.loading = true;
        state.isGenerating = true;
        state.error = null;
        // Reset timeout states when starting new generation
        state.showCanvasSpinner = true;
        state.retryInProgress = false;
        state.timeoutPhase = "none";
        state.retryAttempts = 0;
        state.generationStartTime = Date.now();
      })
      .addCase(generateOutpaint.fulfilled, (state, action) => {
        state.loading = false;
        // Keep isGenerating true - will be reset by WebSocket updates
        // Add operation to track the outpaint
        const operation: TweakOperation = {
          id: Date.now().toString(),
          type: "outpaint",
          data: action.meta.arg,
          status: "processing",
        };
        state.operations.push(operation);
      })
      .addCase(generateOutpaint.rejected, (state, action) => {
        state.loading = false;
        state.isGenerating = false;
        state.error = action.error.message || "Failed to generate outpaint";
      })

      // Generate inpaint
      .addCase(generateInpaint.pending, (state) => {
        state.loading = true;
        state.isGenerating = true;
        state.error = null;
        // Reset timeout states when starting new generation
        state.showCanvasSpinner = true;
        state.retryInProgress = false;
        state.timeoutPhase = "none";
        state.retryAttempts = 0;
        state.generationStartTime = Date.now();
      })
      .addCase(generateInpaint.fulfilled, (state, action) => {
        state.loading = false;
        // Keep isGenerating true - will be reset by WebSocket updates
        const operation: TweakOperation = {
          id: Date.now().toString(),
          type: "inpaint",
          data: action.meta.arg,
          status: "processing",
        };
        state.operations.push(operation);
      })
      .addCase(generateInpaint.rejected, (state, action) => {
        state.loading = false;
        state.isGenerating = false;
        state.error = action.error.message || "Failed to generate inpaint";
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
        state.error = action.error.message || "Failed to add image";
      })

      // Create InputImage from tweak generated
      .addCase(createInputImageFromTweakGenerated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createInputImageFromTweakGenerated.fulfilled,
        (state) => {
          state.loading = false;
          // The newly created input image will be handled by the input images slice
        }
      )
      .addCase(createInputImageFromTweakGenerated.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to create input from tweak result";
      })

      // Save tweak prompt
      .addCase(saveTweakPrompt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveTweakPrompt.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveTweakPrompt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to save tweak prompt";
      })

      // Load tweak prompt
      .addCase(loadTweakPrompt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTweakPrompt.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.data?.generatedPrompt) {
          state.prompt = action.payload.data.generatedPrompt;
        }
      })
      .addCase(loadTweakPrompt.rejected, (state) => {
        state.loading = false;
        // Don't set error for failed prompt loading - just log it
      })
      // Load run Flux Konect
      .addCase(runFluxKonect.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(runFluxKonect.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload) {
          state.runKonectFlux = action.payload;
        }
      })
      .addCase(runFluxKonect.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {
  setCanvasBounds,
  setOriginalImageBounds,
  autoExpandCanvasForOutpaint,
  detectAndExpandCanvas,
  setZoom,
  setPan,
  setCurrentTool,
  setBrushSize,
  undo,
  redo,
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
  setSelectedModel,
  setVariations,
  setIsGenerating,
  startGeneration,
  stopGeneration,
  setSelectedBaseImageId,
  setSelectedBaseImageIdSilent,
  setSelectedBaseImageIdAndClearObjects,
  setSelectedImageContext,
  setSelectedImageWithContext,
  updateImageType,
  clearImageContext,
  hideCanvasSpinner,
  setRetryInProgress,
  setTimeoutPhase,
  incrementRetryAttempts,
  setGenerationStartTime,
  resetTimeoutStates,
  cancelCurrentGeneration,
  resetTweakState,
} = tweakSlice.actions;

export default tweakSlice.reducer;
