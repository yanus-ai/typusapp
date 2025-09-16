import api from '@/lib/api';

export interface UpscaleGenerationRequest {
  imageId: number;
  imageUrl: string;
  prompt?: string;
  scale_factor?: number;
  creativity?: number;
  resemblance?: number;
  variations?: number;
  // Additional fields for better payload tracking
  savePrompt?: boolean;
  preserveAIMaterials?: boolean;
}

export interface UpscaleGenerationResponse {
  success: boolean;
  message: string;
  batchId: number;
  variations: number;
  remainingCredits: number;
  images: {
    id: number;
    status: string;
    replicateJobId: string;
  }[];
}

export interface UpscaleOperationsResponse {
  success: boolean;
  operations: {
    id: number;
    imageUrl?: string;
    processedImageUrl?: string;
    thumbnailUrl?: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    batchId: number;
    variationNumber: number;
    batch: {
      id: number;
      prompt: string;
      createdAt: string;
    };
  }[];
}

class UpscaleApiService {
  async generateUpscale(request: UpscaleGenerationRequest): Promise<UpscaleGenerationResponse> {
    const response = await api.post('/upscale/generate', request);
    return response.data;
  }

  async getUpscaleOperations(baseImageId: number): Promise<UpscaleOperationsResponse> {
    const response = await api.get(`/upscale/operations/${baseImageId}`);
    return response.data;
  }
}

export const upscaleApiService = new UpscaleApiService();