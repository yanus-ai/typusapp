export type SessionResponse = {
  success: boolean;
  data: SessionData;
};

export type SessionData = {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  batches: Batch[];
};

export type Batch = {
  id: number;
  userId: number;
  sessionId: number;
  inputImageId: number;
  moduleType: "CREATE" | string;
  prompt: string;
  totalVariations: number;
  status: "COMPLETED" | "FAILED" | string;
  creditsUsed: number;
  createdAt: string;
  updatedAt: string;
  metaData: BatchMetaData;
  variations: Variation[];
  createSettings: CreateSettings;
};

export type BatchMetaData = {
  uuid: number;
  settings: MetaSettings;
  createdAt: string;
  finalStats: {
    totalVariations: number;
    failedVariations: number;
    successfulVariations: number;
  };
  runpodJobs: {
    imageId: number;
    runpodId: string;
    variationNumber: number;
  }[];
  completedAt: string;
  maskRegions: MaskRegion[];
  submittedAt: string;
  requestGroup: string;
  aiPromptMaterials: any[];
  failedSubmissions: number;
  successfulSubmissions: number;
};

export type MetaSettings = {
  mode: string;
  seed: string;
  model: string;
  style: string | null;
  upscale: string;
  creativity: number;
  resemblance: number;
  cfgKsampler1: number;
  expressivity: number;
  loraStrength: number[];
  cannyStrength: number;
};

export type MaskRegion = {
  id: number;
  color: string; // "(0, 0, 0)"
  prompt: string | null;
  customText: string | null;
  materialOptionId?: number | null;
};

export type Variation = {
  id: number;
  batchId: number;
  userId: number;
  originalImageUrl: string;
  processedImageUrl: string;
  thumbnailUrl: string;
  title: string | null;
  description: string | null;
  variationNumber: number;
  isPublic: boolean;
  status: "COMPLETED" | "FAILED" | string;
  isFavorite: boolean;
  metadata: VariationMetadata;
  createdAt: string;
  updatedAt: string;
  runpodJobId: string;
  runpodStatus: string;
  originalBaseImageId: number | null;
  aiPrompt: string;
  maskMaterialMappings: Record<string, MaskMaterialMapping>;
  aiMaterials: any[];
  contextSelection: any | null;
  generationPrompt: string;
  settingsSnapshot: SettingsSnapshot;
  createUploadId: number | null;
  refineUploadId: number | null;
  tweakUploadId: number | null;
  previewUrl: string;
};

export type VariationMetadata = {
  error: string | null;
  settings: {
    seed: string;
    model: string;
    cfg_ksampler1: number;
    steps_ksampler1: number;
  };
  delayTime?: number;
  dimensions: {
    width: number;
    height: number;
    wasResized: boolean;
    originalWidth: number;
    originalHeight: number;
    processedWidth: number;
    processedHeight: number;
  };
  completedAt: string;
  lastUpdated: string;
  runpodJobId: string;
  submittedAt: string;
  runpodParams: {
    uuid: number;
    requestGroup: string;
    maskRegionsCount: number;
  };
  runpodStatus: string;
  executionTime?: number;
  variationSeed: string;
  processedWebhookIds: string[];
};

export type MaskMaterialMapping = {
  color: string;
  maskUrl: string;
  customText: string | null;
  materialOptionId?: number;
  materialOptionName?: string;
  materialOptionCategory?: string;
  materialOptionImageUrl?: string;
  materialOptionThumbnailUrl?: string;
};

export type SettingsSnapshot = {
  mode: string;
  seed: string;
  task: string;
  model: string;
  style: string | null;
  prompt: string;
  context: any | null;
  regions: Record<string, any>;
  upscale: string;
  category: string | null;
  rawImage: string;
  creativity: number;
  variations: number;
  resemblance: number;
  buildingType: string | null;
  cfgKsampler1: number;
  expressivity: number;
  inputImageId: number;
  loraStrength: number[];
  cannyStrength: number;
  inputImageUrl: string;
  generationTime: string;
  negativePrompt: string;
  styleSelection: any | null;
};

export type CreateSettings = {
  id: number;
  batchId: number;
  mode: string;
  variations: number;
  creativity: number;
  expressivity: number;
  resemblance: number;
  buildingType: string | null;
  category: string | null;
  context: any | null;
  style: string | null;
  regions: Record<string, any>;
  createdAt: string;
};
