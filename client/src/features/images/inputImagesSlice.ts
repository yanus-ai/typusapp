import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

export interface InputImage {
  id: number;
  originalUrl: string;        // S3 URL
  processedUrl?: string;      // Replicate processed URL
  imageUrl: string;           // Display URL (processedUrl || originalUrl)
  thumbnailUrl?: string;
  fileName: string;
  isProcessed: boolean;       // Whether Replicate processing succeeded
  createdAt: Date;
  uploadSource?: string;      // Upload source (CREATE_MODULE, TWEAK_MODULE, etc.)
  // AI prompt related fields
  aiMaterials?: any[];        // Saved AI materials
  aiPrompt?: string;          // Saved AI prompt
  generatedPrompt?: string;   // Generated prompt
  // Cross-module tracking fields
  createUploadId?: number;    // InputImage ID when this input is used in CREATE module
  tweakUploadId?: number;     // InputImage ID when this input is used in TWEAK module
  refineUploadId?: number;    // InputImage ID when this input is used in REFINE module
}

interface InputImagesState {
  images: InputImage[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const initialState: InputImagesState = {
  images: [],
  loading: false,
  error: null,
  uploadProgress: 0,
};

// Async thunks
export const fetchInputImages = createAsyncThunk(
  'inputImages/fetchInputImages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/images/input-images');
      return response.data.map((img: any) => ({
        id: img.id,
        originalUrl: img.originalUrl,
        processedUrl: img.processedUrl,
        imageUrl: img.originalUrl,
        thumbnailUrl: img.thumbnailUrl,
        fileName: img.fileName,
        isProcessed: !!img.processedUrl,
        createdAt: new Date(img.createdAt),
        uploadSource: img.uploadSource,
        // Include AI prompt related fields for restoration
        aiMaterials: img.aiMaterials || [],
        aiPrompt: img.aiPrompt || null,
        generatedPrompt: img.generatedPrompt || null,
        // Cross-module tracking fields
        createUploadId: img.createUploadId,
        tweakUploadId: img.tweakUploadId,
        refineUploadId: img.refineUploadId
      }));
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch input images');
    }
  }
);

export const uploadInputImage = createAsyncThunk(
  'inputImages/uploadInputImage',
  async ({ file, uploadSource = 'CREATE_MODULE' }: { file: File; uploadSource?: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadSource', uploadSource);

      const response = await api.post('/images/upload-input', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.originalUrl, // Use original for high-quality canvas display
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName || file.name,
        uploadSource: response.data.uploadSource,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload image');
    }
  }
);

// Fetch input images by upload source
export const fetchInputImagesBySource = createAsyncThunk(
  'inputImages/fetchInputImagesBySource',
  async ({ uploadSource, page = 1, limit = 100 }: { uploadSource: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/images/input-images-by-source/${uploadSource}`, {
        params: { page, limit }
      });
      
      // Transform the response to ensure correct URL mapping
      const transformedData = {
        ...response.data,
        inputImages: response.data.inputImages.map((img: any) => ({
          id: img.id,
          originalUrl: img.originalUrl || img.imageUrl, // Ensure originalUrl exists
          processedUrl: img.processedUrl,
          imageUrl: img.imageUrl, // This should already be the original URL from server
          thumbnailUrl: img.thumbnailUrl,
          fileName: img.fileName || 'webhook-image.jpg',
          isProcessed: !!(img.processedUrl),
          createdAt: new Date(img.createdAt),
          uploadSource: img.uploadSource,
          dimensions: img.dimensions,
          // Include AI prompt related fields for restoration
          aiMaterials: img.aiMaterials || [],
          aiPrompt: img.aiPrompt || null,
          generatedPrompt: img.generatedPrompt || null,
          // Cross-module tracking fields
          createUploadId: img.createUploadId,
          tweakUploadId: img.tweakUploadId,
          refineUploadId: img.refineUploadId
        }))
      };
      
      return transformedData;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch input images by source');
    }
  }
);

// Add this thunk before createSlice
export const convertGeneratedToInputImage = createAsyncThunk(
  'inputImages/convertGeneratedToInputImage',
  async (generatedImage: { url: string; fileName: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/images/convert-generated-to-input', {
        url: generatedImage.url,
        fileName: generatedImage.fileName,
      });

      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.originalUrl, // Use original for high-quality canvas display
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName || generatedImage.fileName,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert generated image');
    }
  }
);

// Create new InputImage from generated image with masks copied from original InputImage
export const createInputImageFromGenerated = createAsyncThunk(
  'inputImages/createInputImageFromGenerated',
  async ({ 
    generatedImageUrl, 
    generatedThumbnailUrl,
    generatedProcessedUrl,
    generatedImageId, 
    fileName,
    uploadSource = 'CONVERTED_FROM_GENERATED',
    currentPrompt,
    maskPrompts,
    aiMaterials 
  }: { 
    generatedImageUrl: string; 
    generatedThumbnailUrl?: string;
    generatedProcessedUrl?: string;
    generatedImageId: number; 
    fileName: string;
    uploadSource?: string;
    currentPrompt?: string;
    maskPrompts?: Record<string, string>;
    aiMaterials?: any[];
  }, { rejectWithValue }) => {
    try {
      
      const response = await api.post('/images/create-input-from-generated', {
        generatedImageUrl,
        generatedThumbnailUrl,
        generatedProcessedUrl,
        generatedImageId,
        fileName,
        uploadSource,
        currentPrompt,
        maskPrompts,
        aiMaterials
      });

      
      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.originalUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName || fileName,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt),
        uploadSource: response.data.uploadSource
      };
    } catch (error: any) {
      console.error('❌ Failed to create InputImage from generated:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to create InputImage from generated image');
    }
  }
);

// Create input image from existing image for TWEAK module
export const createTweakInputImageFromExisting = createAsyncThunk(
  'inputImages/createTweakInputImageFromExisting',
  async ({ 
    imageUrl, 
    thumbnailUrl, 
    fileName, 
    originalImageId 
  }: { 
    imageUrl: string; 
    thumbnailUrl?: string; 
    fileName?: string;
    originalImageId: number;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/images/create-tweak-input-from-existing', {
        imageUrl,
        thumbnailUrl,
        fileName: fileName || 'tweaked-image.jpg',
        originalImageId,
        uploadSource: 'TWEAK_MODULE'
      });

      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl || response.data.imageUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.imageUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName,
        uploadSource: response.data.uploadSource,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create tweak input image');
    }
  }
);

// Create input image from existing image with configurable upload source (for gallery conversion)
export const createInputImageFromExisting = createAsyncThunk(
  'inputImages/createInputImageFromExisting',
  async ({ 
    imageUrl, 
    thumbnailUrl, 
    fileName, 
    originalImageId,
    uploadSource = 'CREATE_MODULE'
  }: { 
    imageUrl: string; 
    thumbnailUrl?: string; 
    fileName?: string;
    originalImageId: number;
    uploadSource?: 'CREATE_MODULE' | 'TWEAK_MODULE' | 'REFINE_MODULE';
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/images/create-tweak-input-from-existing', {
        imageUrl,
        thumbnailUrl,
        fileName: fileName || 'converted-image.jpg',
        originalImageId,
        uploadSource
      });

      return {
        id: response.data.id,
        originalUrl: response.data.originalUrl || response.data.imageUrl,
        processedUrl: response.data.processedUrl,
        imageUrl: response.data.imageUrl,
        thumbnailUrl: response.data.thumbnailUrl,
        fileName: response.data.fileName,
        uploadSource: response.data.uploadSource,
        isProcessed: response.data.isProcessed || false,
        createdAt: new Date(response.data.createdAt)
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create input image');
    }
  }
);

const inputImagesSlice = createSlice({
  name: 'inputImages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch input images
      .addCase(fetchInputImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInputImages.fulfilled, (state, action) => {
        state.loading = false;
        state.images = action.payload;
      })
      .addCase(fetchInputImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Upload input image
      .addCase(uploadInputImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadInputImage.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
        state.uploadProgress = 0;
      })
      .addCase(uploadInputImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.uploadProgress = 0;
      })
      // Fetch input images by source
      .addCase(fetchInputImagesBySource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInputImagesBySource.fulfilled, (state, action) => {
        state.loading = false;
        state.images = action.payload.inputImages;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInputImagesBySource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Convert generated image to input image
      .addCase(convertGeneratedToInputImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(convertGeneratedToInputImage.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
      })
      .addCase(convertGeneratedToInputImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create input image from generated with mask copy
      .addCase(createInputImageFromGenerated.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInputImageFromGenerated.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
      })
      .addCase(createInputImageFromGenerated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create tweak input image from existing
      .addCase(createTweakInputImageFromExisting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTweakInputImageFromExisting.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
      })
      .addCase(createTweakInputImageFromExisting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create input image from existing with configurable upload source
      .addCase(createInputImageFromExisting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInputImageFromExisting.fulfilled, (state, action) => {
        state.loading = false;
        state.images = [action.payload, ...state.images];
      })
      .addCase(createInputImageFromExisting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUploadProgress } = inputImagesSlice.actions;
export default inputImagesSlice.reducer;