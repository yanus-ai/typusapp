import api from '@/lib/api';

export interface CreateInputImageFromGeneratedRequest {
  generatedImageUrl: string;
  generatedThumbnailUrl?: string;
  generatedProcessedUrl?: string;
  originalInputImageId: number;
  fileName: string;
  uploadSource: 'CREATE_MODULE' | 'TWEAK_MODULE' | 'REFINE_MODULE';
  currentPrompt?: string;
  maskPrompts?: Record<string, string>;
}

export interface CreateInputImageFromGeneratedResponse {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  processedUrl?: string;
  filename: string;
  uploadSource: string;
  aiPrompt?: string;
  maskRegions: any[];
  aiPromptMaterials: any[];
}

class ImageService {
  async createInputImageFromGenerated(request: CreateInputImageFromGeneratedRequest): Promise<CreateInputImageFromGeneratedResponse> {
    const response = await api.post('/images/create-input-from-generated', request);
    return response.data;
  }
}

export const imageService = new ImageService();