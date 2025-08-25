import api from '@/lib/api';

export interface RunPodGenerationRequest {
  prompt: string | null;
  negativePrompt?: string;
  inputImageId: number;
  variations?: number;
  settings?: {
    seed?: string;
    model?: string;
    upscale?: 'Yes' | 'No';
    style?: 'Yes' | 'No';
    stepsKsampler1?: number;
    cfgKsampler1?: number;
    denoiseKsampler1?: number;
    stepsKsampler2?: number;
    cfgKsampler2?: number;
    denoiseKsampler2?: number;
    cannyStrength?: number;
    cannyStart?: number;
    cannyEnd?: number;
    depthStrength?: number;
    depthStart?: number;
    depthEnd?: number;
    loraNames?: string[];
    loraStrength?: number[];
    loraClip?: number[];
  };
}

export interface CreateFromBatchRequest {
  batchId: number;
  selectedImageId?: number;
  prompt?: string;
  negativePrompt?: string;
  variations?: number;
  settings?: {
    seed?: string;
    model?: string;
    upscale?: 'Yes' | 'No';
    style?: 'Yes' | 'No';
    stepsKsampler1?: number;
    cfgKsampler1?: number;
    denoiseKsampler1?: number;
    stepsKsampler2?: number;
    cfgKsampler2?: number;
    denoiseKsampler2?: number;
    cannyStrength?: number;
    cannyStart?: number;
    cannyEnd?: number;
    depthStrength?: number;
    depthStart?: number;
    depthEnd?: number;
    loraNames?: string[];
    loraStrength?: number[];
    loraClip?: number[];
  };
}

export interface CreateFromBatchResponse {
  message: string;
  newInputImage: {
    id: number;
    filename: string;
    originalUrl: string;
    compressedUrl: string;
  };
  batchId: number;
  variations: number;
}

export interface RunPodGenerationResponse {
  success: boolean;
  batchId: number;
  runpodId: string;
  status: string;
  message: string;
  estimatedTime: string;
  runpodJobs?: {
    imageId: number;
    status: string;
    runpodStatus: string;
  }[];
}

export interface RunPodBatchStatus {
  batchId: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  prompt: string;
  totalVariations: number;
  creditsUsed: number;
  metadata?: any;
  images: {
    id: number;
    url: string;
    thumbnailUrl?: string;
    variationNumber: number;
    status: string;
    createdAt: string;
  }[];
}

export interface RunPodHistoryResponse {
  batches: {
    id: number;
    status: string;
    createdAt: string;
    prompt: string;
    totalVariations: number;
    creditsUsed: number;
    previewImage: string | null;
    inputImage: {
      id: number;
      thumbnailUrl: string;
    };
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RunPodVariationsResponse {
  variations: {
    id: number;
    imageUrl: string;
    thumbnailUrl?: string;
    batchId: number;
    variationNumber: number;
    status: 'COMPLETED';
    createdAt: string;
    maskMaterialMappings?: Record<string, any>;
    aiPrompt?: string;
    aiMaterials?: any[];
    batch: {
      id: number;
      prompt: string;
      createdAt: string;
    };
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class RunPodApiService {
  async generateImages(request: RunPodGenerationRequest): Promise<RunPodGenerationResponse> {
    const response = await api.post('/runpod/generate', request);
    return response.data;
  }

  async getBatchStatus(batchId: number): Promise<RunPodBatchStatus> {
    const response = await api.get(`/runpod/status/${batchId}`);
    return response.data;
  }

  async getHistory(page = 1, limit = 10): Promise<RunPodHistoryResponse> {
    const response = await api.get(`/runpod/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getAllVariations(page = 1, limit = 50): Promise<RunPodVariationsResponse> {
    const response = await api.get(`/runpod/variations?page=${page}&limit=${limit}`);
    return response.data;
  }

  async createFromBatch(request: CreateFromBatchRequest): Promise<CreateFromBatchResponse> {
    const response = await api.post('/runpod/create-from-batch', request);
    return response.data;
  }
}

export const runpodApiService = new RunPodApiService();