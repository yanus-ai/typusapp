import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { WandSparkles, X, House, Sparkle, Cloudy, TreePalm } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setSelectedMaskId, setMaskInput, clearMaskStyle, removeAIPromptMaterial, removeAIPromptMaterialLocal, generateAIPrompt, setSavedPrompt, getAIPromptMaterials, generateMasks } from '@/features/masks/maskSlice';
// Note: setSelectedModel is accessed via dispatch with action type
import { uploadInputImage } from '@/features/images/inputImagesSlice';
import ContextToolbar from './ContextToolbar';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import toast from 'react-hot-toast';

interface AIPromptInputProps {
  editInspectorMinimized: boolean; // Whether the inspector is minimized
  handleSubmit: (userPrompt?: string, contextSelection?: string, attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] }, options?: { size?: string; aspectRatio?: string }) => Promise<void> | void; // Function to handle form submission with user prompt and context
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
  inputImageId?: number; // Add inputImageId prop
  // Props for data isolation based on selected image type
  currentPrompt?: string;
  currentAIMaterials?: any[];
  // New props for generation tracking
  onGenerationStart?: (batchId: number) => void;
  onGenerationComplete?: () => void;
}

// Multi-image upload tile with mini thumbnails and remove buttons
const MultiUploadTile: React.FC<{
  label: string;
  imageUrls: string[];
  onSelectFiles?: (files: File[]) => void;
  onRemoveAt?: (index: number) => void;
  onDropUrl?: (url: string) => void;
}> = ({ label, imageUrls, onSelectFiles, onRemoveAt, onDropUrl }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const extractUrl = (e: React.DragEvent) => {
    const types = e.dataTransfer.types || [];
    // Try common formats first
    let raw = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (!raw) {
      for (const t of Array.from(types)) {
        try {
          const val = e.dataTransfer.getData(t);
          if (!val) continue;
          if (t.includes('json')) {
            const obj = JSON.parse(val);
            const candidate = obj?.imageUrl || obj?.url || obj?.src;
            if (typeof candidate === 'string') return candidate;
          }
          if (/https?:\/\//i.test(val)) return val.split('\n')[0];
        } catch {}
      }
    }
    if (raw && /https?:\/\//i.test(raw)) return raw.split('\n')[0];
    return undefined;
  };
  return (
    <div
      className="min-h-32 md:min-h-36 rounded-lg border-2 border-dashed border-white/40 text-white/90 hover:border-white/70 transition-colors relative overflow-hidden bg-black/20 p-2"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')) : [];
        if (files.length && onSelectFiles) {
          onSelectFiles(files);
          return;
        }
        // Support URL drops from catalog
        const url = extractUrl(e);
        if (url && onDropUrl) onDropUrl(url);
      }}
      title={label}
    >
      {imageUrls && imageUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2 relative">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden bg-black/30">
              <img src={url} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
              {onRemoveAt && (
                <button
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full hover:bg-black/90 transition-colors z-10"
                  onClick={(e) => { e.stopPropagation(); onRemoveAt(idx); }}
                  title="Remove"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
          {/* Persistent plus button to indicate more uploads allowed */}
          <button
            type="button"
            className="w-16 h-16 rounded-md border border-dashed border-white/50 flex items-center justify-center hover:border-white transition-colors"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            title={label}
          >
            <div className="w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center">
              <span className="text-base leading-none">+</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <div className="w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center">
            <span className="text-lg leading-none">+</span>
          </div>
          <span className="text-xs uppercase tracking-wide text-white/90 text-center px-2">{label}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length && onSelectFiles) onSelectFiles(files);
        if (e.target) e.target.value = '';
      }} />
    </div>
  );
};

// Single-file drop/upload tile (used for Base Image)
const DropUploadTile: React.FC<{
  label: string;
  imageUrl?: string;
  onFiles?: (files: File[]) => void;
  onDropUrl?: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}> = ({ label, imageUrl, onFiles, onDropUrl, onRemove, className }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const extractUrl = (e: React.DragEvent) => {
    const types = e.dataTransfer.types || [];
    let raw = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (!raw) {
      for (let i = 0; i < types.length; i++) {
        const t = types[i];
        try {
          const val = e.dataTransfer.getData(t);
          if (!val) continue;
          if (t.includes('json')) {
            const obj = JSON.parse(val);
            const candidate = obj?.imageUrl || obj?.url || obj?.src;
            if (typeof candidate === 'string') return candidate;
          }
          if (/https?:\/\//i.test(val)) return val.split('\n')[0];
        } catch {}
      }
    }
    if (raw && /https?:\/\//i.test(raw)) return raw.split('\n')[0];
    return undefined;
  };
  return (
    <div
      className={className || "h-32 md:h-36 rounded-lg border-2 border-dashed border-white/40 flex items-center justify-center text-white/90 hover:border-white/70 transition-colors relative overflow-hidden bg-black/20"}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')) : [];
        if (files.length && onFiles) {
          onFiles(files);
          return;
        }
        // Support URL drops from catalog
        const url = extractUrl(e);
        if (url && onDropUrl) onDropUrl(url);
      }}
      title={label}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={label} className="w-full h-full object-contain" />
          {onRemove && (
            <button
              className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-black/90 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="Remove"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center">
            <span className="text-lg leading-none">+</span>
          </div>
          <span className="text-xs uppercase tracking-wide text-white/90 text-center px-2">{label}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && onFiles) onFiles([file]);
        if (e.target) e.target.value = '';
      }} />
    </div>
  );
};

const AIPromptInput: React.FC<AIPromptInputProps> = ({ 
  editInspectorMinimized,
  handleSubmit,
  setIsPromptModalOpen,
  loading = false,
  error,
  inputImageId,
  currentPrompt,
  currentAIMaterials,
  onGenerationStart,
  onGenerationComplete
}) => {
  const dispatch = useAppDispatch();
  const selectedMaskId = useAppSelector(state => state.masks.selectedMaskId);
  const maskInputs = useAppSelector(state => state.masks.maskInputs);
  const aiPromptMaterials = useAppSelector(state => state.masks.aiPromptMaterials);
  
  const aiPromptLoading = useAppSelector(state => state.masks.aiPromptLoading);
  const savedPrompt = useAppSelector(state => state.masks.savedPrompt);
  
  const [prompt, setPrompt] = useState('');
  const [editingMaskId, setEditingMaskId] = useState<number | null>(null);
  const [localMaskInputs, setLocalMaskInputs] = useState<{[key: number]: string}>({});
  // Attachments state: base image, surrounding textures, and walls textures
  const [attachments, setAttachments] = useState<{ baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] }>({});
  const [attachmentImages, setAttachmentImages] = useState<{ baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] }>({});
  // Persist attachments per base image
  const [attachmentsByBase, setAttachmentsByBase] = useState<Record<number, { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] }>>({});
  // Compute effective base image id from props or current selection
  const selectedImageIdGlobal = useAppSelector(state => state.createUI.selectedImageId);
  const selectedImageTypeGlobal = useAppSelector(state => state.createUI.selectedImageType);
  const effectiveInputId = (inputImageId !== undefined && inputImageId !== null)
    ? inputImageId
    : (selectedImageTypeGlobal === 'input' ? selectedImageIdGlobal : undefined);
  const lastEffectiveIdRef = useRef<number | undefined>(effectiveInputId);
  const allInputImages = useAppSelector(state => state.inputImages.images);
  const historyImages = useAppSelector(state => state.historyImages.images);
  
  // Check if selected image is generated
  const isGeneratedImage = selectedImageTypeGlobal === 'generated';
  
  // 2-minute loading state management
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync attachments when base image changes OR when generated image is selected
  useEffect(() => {
    // If it's a generated image, restore attachments from localStorage
    if (isGeneratedImage && selectedImageIdGlobal) {
      try {
        const key = `create.attachments.generated.${selectedImageIdGlobal}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const attachmentData = JSON.parse(stored);
          setAttachments(attachmentData);
          setAttachmentImages(attachmentData);
          
          // Also store in attachmentsByBase with originalInputImageId if available
          const generatedImage = historyImages.find(img => img.id === selectedImageIdGlobal);
          if (generatedImage?.originalInputImageId) {
            const originalInputId = generatedImage.originalInputImageId as number;
            setAttachmentsByBase(prev => ({ ...prev, [originalInputId]: attachmentData }));
          }
          return;
        }
      } catch (error) {
        console.error('Failed to restore generated image attachments:', error);
      }
    }
    
    // Persist current attachments under the previous base id before switching
    const prevId = lastEffectiveIdRef.current;
    if (prevId && (!attachmentsByBase[prevId] || attachmentsByBase[prevId] !== attachments)) {
      setAttachmentsByBase(prev => ({ ...prev, [prevId]: { ...(prev[prevId] || {}), ...attachments } }));
    }

    // Load scoped context for the new base id
    if (effectiveInputId) {
      let scopedExisting = attachmentsByBase[effectiveInputId] || {};
      // Always fetch latest from backend and merge over any local cache
      (async () => {
        try {
          const res = await fetch(`/api/images/attachments/latest/${effectiveInputId}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const att = data?.data?.attachments || {};
            const hydrated = {
              baseImageUrl: att.baseAttachmentUrl ?? scopedExisting.baseImageUrl,
              referenceImageUrls: att.referenceImageUrls ?? scopedExisting.referenceImageUrls ?? [],
              // Support both new structure (surroundingUrls/wallsUrls) and old (textureUrls for backward compatibility)
              surroundingUrls: att.surroundingUrls ?? scopedExisting.surroundingUrls ?? (att.textureUrls?.length ? att.textureUrls : []) ?? [],
              wallsUrls: att.wallsUrls ?? scopedExisting.wallsUrls ?? []
            } as typeof scopedExisting;
            setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: hydrated }));
            setAttachments(hydrated);
            setAttachmentImages(hydrated);
          } else {
            setAttachments(scopedExisting);
            setAttachmentImages(scopedExisting);
          }
        } catch {
          setAttachments(scopedExisting);
          setAttachmentImages(scopedExisting);
        }
      })();
    } else if (!isGeneratedImage) {
      // Only clear attachments if not a generated image
      setAttachments({});
      setAttachmentImages({});
    }
    lastEffectiveIdRef.current = effectiveInputId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveInputId, isGeneratedImage, selectedImageIdGlobal]);

  // Persist per-base attachments to localStorage so context survives modal close
  useEffect(() => {
    try {
      const key = 'create.attachmentsByBase';
      localStorage.setItem(key, JSON.stringify(attachmentsByBase));
    } catch {}
  }, [attachmentsByBase]);

  // Persist current base's attachments into the map whenever the user changes them
  useEffect(() => {
    if (!effectiveInputId) return;
    setAttachmentsByBase(prev => {
      const next = { ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), ...attachments } };
      try {
        localStorage.setItem('create.attachmentsByBase', JSON.stringify(next));
      } catch {}
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, effectiveInputId]);

  // Restore per-base attachments on mount
  useEffect(() => {
    try {
      const key = 'create.attachmentsByBase';
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setAttachmentsByBase(parsed);
          if (inputImageId && parsed[inputImageId]) {
            setAttachments(parsed[inputImageId]);
            setAttachmentImages(parsed[inputImageId]);
          }
        }
      }
    } catch {}
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use currentPrompt prop (from selected image) or fallback to savedPrompt from Redux
  useEffect(() => {
    const effectivePrompt = currentPrompt || savedPrompt || '';
    setPrompt(effectivePrompt);
  }, [currentPrompt, savedPrompt]);

  // Timer effect for 2-minute countdown
  useEffect(() => {
    if (isGenerating && generationStartTime) {
      // Start countdown interval
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - generationStartTime;
        const remaining = Math.max(0, 120000 - elapsed); // 2 minutes in milliseconds
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          // Timeout reached
          handleGenerationTimeout();
        }
      }, 1000);

      // Set timeout for 2 minutes
      timeoutRef.current = setTimeout(() => {
        handleGenerationTimeout();
      }, 120000); // 2 minutes
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isGenerating, generationStartTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Always prioritize Redux state (user changes) over static prop data
  const effectiveAIMaterials = aiPromptMaterials.length > 0 ? aiPromptMaterials : (currentAIMaterials || []);

  // Generation control functions
  const startGeneration = (batchId: number) => {
    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setCurrentBatchId(batchId);
    setTimeRemaining(120000); // 2 minutes
    
    // Notify parent component
    if (onGenerationStart) {
      onGenerationStart(batchId);
    }
  };

  const handleGenerationComplete = () => {
    
    // Clear timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset state
    setIsGenerating(false);
    setGenerationStartTime(null);
    setTimeRemaining(null);
    setCurrentBatchId(null);
    
    // Notify parent and close modal
    if (onGenerationComplete) {
      onGenerationComplete();
    }
    setIsPromptModalOpen(false);
  };

  const handleGenerationTimeout = () => {
    
    // Clear timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset state
    setIsGenerating(false);
    setGenerationStartTime(null);
    setTimeRemaining(null);
    setCurrentBatchId(null);
    
    // Close modal
    setIsPromptModalOpen(false);
  };

  // Format remaining time for display
  const formatTimeRemaining = (timeMs: number) => {
    const totalSeconds = Math.ceil(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get mask state from Redux
  const {
    masks,
    maskStatus,
    loading: maskLoading,
  } = useAppSelector(state => state.masks);

  const handleMaskSelect = (maskId: number) => {
    // If clicking the image of the already selected mask and not editing, unselect
    if (selectedMaskId === maskId && editingMaskId !== maskId) {
      dispatch(setSelectedMaskId(null));
    } else {
      dispatch(setSelectedMaskId(maskId));
    }
    // When image is clicked, editing mode is off
    setEditingMaskId(null);
  };

  const handleInputChange = (maskId: number, value: { displayName: string; imageUrl: string | null, category: string }) => {
    // Update local state immediately for responsive UI
    setLocalMaskInputs(prev => ({
      ...prev,
      [maskId]: value.displayName
    }));
    
    // Update Redux state
    dispatch(setMaskInput({ maskId, value }));
  };

  const clearSelectMask = (maskId: number) => {
    // Clear local state
    setLocalMaskInputs(prev => ({
      ...prev,
      [maskId]: ''
    }));
    
    dispatch(setMaskInput({ maskId: maskId, value: { displayName: '', imageUrl: null, category: '' } }));
    dispatch(setSelectedMaskId(null));    
    dispatch(clearMaskStyle(maskId));
  };

  const handleRemoveMaterial = async (materialId: number) => {
    try {
      // 1. Immediately remove from local state for instant UI feedback
      dispatch(removeAIPromptMaterialLocal(materialId));
      
      // 2. Remove from backend (this will happen in background)
      // Only call backend if it's a real ID (positive) not temporary ID (negative)
      if (materialId > 0) {
        await dispatch(removeAIPromptMaterial(materialId)).unwrap();
      }
    } catch (error) {
      console.error('❌ Failed to remove material from backend:', error);
      
      // Revert the local removal since backend failed by reloading the materials
      if (inputImageId) {
        dispatch(getAIPromptMaterials(inputImageId));
      }
    }
  };

  const handleGenerateAIPrompt = async () => {
    const fallbackId = inputImageId || (selectedImageTypeGlobal === 'input' ? selectedImageIdGlobal : undefined) || allInputImages?.[0]?.id;
    if (!fallbackId) {
      // Fallback: construct prompt from selected materials if no input exists at all
      const materialsTextArray = aiPromptMaterials.map(material => material.subCategory?.displayName ? `${material.subCategory.displayName} ${material.displayName}` : material.displayName);
      const materialsText = materialsTextArray.join(', ').toUpperCase();
      if (materialsText) setPrompt(materialsText);
      return;
    }
    
    try {
      // Sync local mask inputs to Redux before generating AI prompt
      Object.entries(localMaskInputs).forEach(([maskId, displayName]) => {
        dispatch(setMaskInput({ 
          maskId: parseInt(maskId), 
          value: { 
            displayName: displayName.trim(),
            imageUrl: maskInputs[parseInt(maskId)]?.imageUrl || null,
            category: maskInputs[parseInt(maskId)]?.category || ''
          }
        }));
      });
      
      // Collect AI prompt materials and format as comma-separated text
      const materialsTextArray = aiPromptMaterials.map(material => {
        // Include subcategory if available for better context
        if (material.subCategory?.displayName) {
          return `${material.subCategory.displayName} ${material.displayName}`;
        }
        return material.displayName;
      });
      const materialsText = materialsTextArray.join(', ').toUpperCase();
      
      
      const result = await dispatch(generateAIPrompt({
        inputImageId: fallbackId,
        userPrompt: prompt,
        materialsText: materialsText, // Send materials text from frontend
        includeSelectedMaterials: false // Don't fetch from backend
      })).unwrap();
      
      // Update the prompt textarea with the generated prompt
      if (result.data.generatedPrompt) {
        setPrompt(result.data.generatedPrompt);
      }
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
    }
  };

  // Handler for create regions button
  const handleCreateRegions = async () => {
    if (!effectiveInputId) {
      toast.error('Please select or upload a base image first');
      return;
    }

    // Find the input image to get its URL
    const inputImage = allInputImages.find(img => img.id === effectiveInputId);
    const imageUrl = inputImage?.originalUrl || inputImage?.imageUrl || inputImage?.processedUrl || attachments.baseImageUrl;

    if (!imageUrl) {
      toast.error('No image available for region generation');
      return;
    }

    try {
      await dispatch(generateMasks({
        inputImageId: effectiveInputId,
        imageUrl: imageUrl,
        callbackUrl: `${import.meta.env.VITE_API_URL}/masks/callback`
      })).unwrap();
      toast.success('Region generation started');
    } catch (error: any) {
      console.error('Failed to generate regions:', error);
      toast.error(error?.message || 'Failed to generate regions');
    }
  };

  // Handler for settings button
  const handleSettingsClick = () => {
    // For now, toggle the prompt modal - can be extended for settings panel
    setIsPromptModalOpen(true);
  };

  const getMaskIcon = (mask: any) => {
    // First check if there's a customization option with subCategory
    if (mask.customizationOption?.subCategory?.slug) {
      switch (mask.customizationOption.subCategory.slug) {
        case 'type':
          return <House className="w-6 h-6 text-white" />;
        case 'lighting':
          return <Sparkle className="w-6 h-6 text-white" />;
        case 'weather':
          return <Cloudy className="w-6 h-6 text-white" />;
        case 'context':
          return <TreePalm className="w-6 h-6 text-white" />;
        case 'style':
          return <Sparkle className="w-6 h-6 text-white" />;
        default:
          return <Sparkle className="w-6 h-6 text-white" />; // Default for customization options
      }
    }
    
    // Then check if there's a subCategory for the mask region itself
    if (mask.subCategory) {
      switch (mask.subCategory.slug || mask.subCategory.name) {
        case 'type':
          return <House className="w-6 h-6 text-white" />;
        case 'lighting':
          return <Sparkle className="w-6 h-6 text-white" />;
        case 'weather':
          return <Cloudy className="w-6 h-6 text-white" />;
        case 'context':
          return <TreePalm className="w-6 h-6 text-white" />;
        case 'walls':
          return <House className="w-6 h-6 text-white" />; // Use House icon for walls
        case 'floors':
          return <House className="w-6 h-6 text-white" />; // Use House icon for floors  
        case 'style':
          return <Sparkle className="w-6 h-6 text-white" />; // Use Sparkle for style
        default:
          return <House className="w-6 h-6 text-white" />; // Default fallback
      }
    }
    
    // Fallback to maskInputs category if no subCategory available
    const category = maskInputs[mask.id]?.category;
    switch (category) {
      case 'type':
        return <House className="w-6 h-6 text-white" />;
      case 'lighting':
        return <Sparkle className="w-6 h-6 text-white" />;
      case 'weather':
        return <Cloudy className="w-6 h-6 text-white" />;
      case 'context':
        return <TreePalm className="w-6 h-6 text-white" />;
      case 'walls':
        return <House className="w-6 h-6 text-white" />;
      case 'floors':
        return <House className="w-6 h-6 text-white" />;
      case 'style':
        return <Sparkle className="w-6 h-6 text-white" />;
      default:
        return <House className="w-6 h-6 text-white" />; // Default fallback
    }
  }

  return (
    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-xs`}>
      {/* Modal content */}
      <div className={`rounded-lg w-full max-w-6xl mx-4 overflow-hidden relative h-full flex ${!editInspectorMinimized && maskStatus !== 'none' ? 'pr-[80px]' : ''}`}>
        {/* Close button in the top-right corner */}
        {!isGenerating && (
          <button 
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-black transition-colors cursor-pointer"
            onClick={() => setIsPromptModalOpen(false)}
          >
            <X className="h-8 w-8 text-white" />
          </button>
        )}

        {/* Left Panel - Picture Regions */}
        {
          (maskStatus !== "none" && (masks.some(mask => mask.isVisible !== false) || maskStatus === 'processing')) &&
            <div className="w-1/3 pt-20 pb-24 flex flex-col">
            <h3 className="text-white text-lg font-semibold mb-4">Picture Regions</h3>
            {maskStatus === 'completed' && masks.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-y-auto hide-scrollbar">
                <div className="grid grid-cols-1 gap-3">
                  {masks.filter(mask => mask.isVisible !== false).map((mask, index) => {
                    const isSelected = selectedMaskId === mask.id;
                    return (
                      <div key={mask.id} className='flex items-center gap-3 text-white'>
                        <div className='flex items-center gap-1'>
                          <div
                            className={`relative rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all flex gap-4 flex-shrink-0 ${
                              isSelected
                                ? 'border-black w-[163px] h-[159px]'
                                : 'border-gray-600 hover:border-gray-500 h-[70px] w-[68px]'
                            }`}
                            onClick={() => handleMaskSelect(mask.id)}
                          >
                            <img
                              src={mask.maskUrl}
                              alt={`Region ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          {/* Show material/customization option if any exist */}
                          {
                            (mask.materialOption || mask.customizationOption || maskInputs[mask.id]?.imageUrl || maskInputs[mask.id]?.category) && (
                              <div
                                className={`relative rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all flex gap-4 flex-shrink-0 h-[70px] w-[68px] flex items-center justify-center ${
                                  mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || maskInputs[mask.id]?.imageUrl 
                                    ? 'bg-gray-200' 
                                    : ''
                                }`}
                                onClick={() => clearSelectMask(mask.id)}
                                title={`Clear ${mask.customText || mask.materialOption?.displayName || mask.customizationOption?.displayName || 'selection'}`}
                              >
                                {(mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || maskInputs[mask.id]?.imageUrl) ? (
                                  <img
                                    src={mask.materialOption?.thumbnailUrl || mask.customizationOption?.thumbnailUrl || maskInputs[mask.id]?.imageUrl || undefined}
                                    alt={`${mask.customText || mask.materialOption?.displayName || mask.customizationOption?.displayName || 'Region'} ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    {getMaskIcon(mask)}
                                  </div>
                                )}
                              </div>
                            )
                          }
                        </div>
                        <input
                          id={`mask-displayName-${mask.id}`}
                          className="uppercase bg-transparent px-2 py-1 text-white flex-1 w-auto ring-none focus:ring-none outline-none"
                          placeholder="Select from catalog or type"
                          value={(() => {
                            // Priority: local state > Redux state > existing mask data
                            const localValue = localMaskInputs[mask.id];
                            if (localValue !== undefined) {
                              return localValue;
                            }
                            
                            const reduxValue = maskInputs[mask.id]?.displayName;
                            if (reduxValue !== undefined) {
                              return reduxValue;
                            }
                            
                            return mask.customText || 
                              mask.materialOption?.displayName ||
                              mask.customizationOption?.displayName ||
                              '';
                          })()}
                          onFocus={() => {
                            dispatch(setSelectedMaskId(mask.id));
                            setEditingMaskId(mask.id);
                          }}
                          onBlur={() => setEditingMaskId(null)}
                          onChange={e => handleInputChange(mask.id, { 
                            displayName: e.target.value,
                            imageUrl: maskInputs[mask.id]?.imageUrl || null,
                            category: maskInputs[mask.id]?.category || ''
                          })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (maskStatus === 'processing' || maskLoading) ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center mb-4">
                  <DotLottieReact
                    src={squareSpinner}
                    autoplay
                    loop
                    style={{ width: 48, height: 48 }}
                  />
                </div>
                <p className="text-white text-base font-medium">Generating regions...</p>
                <p className="text-gray-300 text-sm mt-2">Analyzing your image to detect editable areas</p>
                <div className="mt-4 flex justify-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            ) : maskStatus === 'failed' && (
              <div className="text-center py-8">
                <div className="text-red-400 text-sm mb-2">⚠️ Failed to generate regions</div>
                <p className="text-gray-500 text-xs text-white">Please try generating regions again from the Edit Inspector</p>
              </div>
            )}
            </div>
        }

        {/* Right Panel - Prompt Input */}
        <div className="flex-1 pt-4 md:pt-8 pb-24 px-3 md:px-6 flex flex-col justify-center">
          <div className="max-w-4xl m-auto w-full flex flex-col flex-1 overflow-y-auto hide-scrollbar">
            {/* AI Prompt Materials Tags */}
            <div>
              {effectiveAIMaterials.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {effectiveAIMaterials.map(material => (
                      <div 
                        key={material.id} 
                        className="uppercase bg-transparent backdrop-blur-sm text-white text-sm py-2 px-3 rounded border border-white/50 flex items-center gap-2 shadow-lg transition-all duration-200"
                        style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                      >
                        <span className=''>
                          {material.subCategory?.displayName ? `${material.subCategory.displayName} ${material.displayName}` : material.displayName}
                        </span>
                        <button
                          onClick={() => handleRemoveMaterial(material.id)}
                          className="text-gray-300 hover:text-white transition-colors"
                          style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                          title="Remove material"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4 flex-1 flex relative mb-4">
              <textarea
                id="prompt-input"
                className="flex-1 w-full text-white bg-transparent backdrop-blur-sm border border-white/50 border-2 rounded-lg py-4 px-4 focus:outline-none focus:border-white focus:backdrop-blur-md resize-none min-h-[160px] md:min-h-[180px] text-base md:text-lg uppercase placeholder:text-gray-300/80 shadow-lg transition-all duration-200 text-shadow-lg"
                style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                placeholder="CREATE AN ARCHITECTURAL VISUALIZATION OF AVANT-GARDE INNOVATIVE INDUSTRIAL"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleGenerateAIPrompt();
                  }
                }}
                disabled={loading}
                rows={6}
              />
              
              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-800">
                  {error}
                </div>
              )}

              {/* Generate AI Prompt Button */}
              <Button
                className="absolute h-auto bottom-4 right-2 bg-transparent hover:bg-transparent text-white flex items-center justify-center gap-2 hover:text-white group p-2"
                onClick={handleGenerateAIPrompt}
                disabled={aiPromptLoading}
              >
                {aiPromptLoading ? (
                  <div>
                    <DotLottieReact
                      src={squareSpinner}
                      autoplay
                      loop
                      style={{ width: 24, height: 24 }}
                    />
                  </div>
                ) : (
                  <div className="group-hover:scale-110">
                    <WandSparkles className='size-6' />
                  </div>
                )}
              </Button>
            </div>

            {/* Helper boxes under the prompt */}
            {maskStatus === 'none' && (
              <div className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
                  {/* First box: Add base image */}
                  <div className="min-h-[200px] flex">
                    <div className="flex-1 h-[200px]">
                      <DropUploadTile 
                      label="Add base image"
                      imageUrl={attachmentImages.baseImageUrl}
                      className="h-full rounded-lg border-2 border-dashed border-white/40 flex items-center justify-center text-white/90 hover:border-white/70 transition-colors relative overflow-hidden bg-black/20"
                      onFiles={async (files: File[]) => {
                        if (!files.length) return;
                        const file = files[0];
                        const action = await dispatch(uploadInputImage({ file, uploadSource: 'CREATE_MODULE' }));
                        if (uploadInputImage.fulfilled.match(action)) {
                          const res = action.payload as any;
                          setAttachments(prev => ({ ...prev, baseImageUrl: res.originalUrl }));
                          setAttachmentImages(prev => ({ ...prev, baseImageUrl: res.thumbnailUrl || res.originalUrl }));
                          if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), baseImageUrl: res.originalUrl, surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                        }
                      }}
                      onDropUrl={async (url: string) => {
                        console.log('🖼️ Dropped URL to base image:', url);
                        try {
                          // Check if URL is already from our S3 (input image URL) - use it directly
                          if (url.includes('prai-vision.s3') || url.includes('input-images')) {
                            console.log('✅ Using existing S3 URL directly:', url);
                            setAttachments(prev => ({ ...prev, baseImageUrl: url }));
                            setAttachmentImages(prev => ({ ...prev, baseImageUrl: url }));
                            if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), baseImageUrl: url, surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                            return;
                          }
                          
                          // Otherwise, fetch and re-upload
                          console.log('📥 Fetching and uploading dropped URL...');
                          const resp = await fetch(url, { mode: 'cors' });
                          if (!resp.ok) {
                            throw new Error(`Failed to fetch image: ${resp.status} ${resp.statusText}`);
                          }
                          const blob = await resp.blob();
                          const file = new File([blob], 'catalog-image.jpg', { type: blob.type || 'image/jpeg' });
                          const action = await dispatch(uploadInputImage({ file, uploadSource: 'CREATE_MODULE' }));
                          if (uploadInputImage.fulfilled.match(action)) {
                            const res = action.payload as any;
                            console.log('✅ Base image uploaded successfully:', res.originalUrl);
                            setAttachments(prev => ({ ...prev, baseImageUrl: res.originalUrl }));
                            setAttachmentImages(prev => ({ ...prev, baseImageUrl: res.thumbnailUrl || res.originalUrl }));
                            if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), baseImageUrl: res.originalUrl, surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                          } else {
                            const error = uploadInputImage.rejected.match(action) ? action.payload : 'Upload failed';
                            console.error('❌ Base image upload failed:', error);
                            toast.error('Failed to upload base image. Please try again.');
                          }
                        } catch (e: any) {
                          console.error('❌ Failed to process dropped base image:', e);
                          toast.error(e?.message || 'Failed to process dropped image. Please try again.');
                        }
                      }}
                      onRemove={() => {
                        setAttachments(prev => ({ ...prev, baseImageUrl: undefined }));
                        setAttachmentImages(prev => ({ ...prev, baseImageUrl: undefined }));
                        if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), baseImageUrl: undefined, surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                      }}
                    />
                    </div>
                  </div>

                  {/* Second box: Texture samples container with two sub-boxes */}
                  <div className="rounded-lg border-2 border-dashed border-white/40 bg-black/20 p-3 space-y-3 min-h-[140px] flex flex-col">
                    <h3 className="text-white text-xs font-medium uppercase tracking-wide">Texture samples</h3>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                    <MultiUploadTile 
                      label="Surrounding" 
                      imageUrls={attachmentImages.surroundingUrls || []}
                      onSelectFiles={async (files: File[]) => {
                        for (const file of files) {
                          const action = await dispatch(uploadInputImage({ file, uploadSource: 'GALLERY_UPLOAD' }));
                          if (uploadInputImage.fulfilled.match(action)) {
                            const res = action.payload as any;
                            setAttachments(prev => ({ ...prev, surroundingUrls: [...(prev.surroundingUrls || []), res.originalUrl] }));
                            setAttachmentImages(prev => ({ ...prev, surroundingUrls: [...(prev.surroundingUrls || []), res.thumbnailUrl || res.originalUrl] }));
                            if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), baseImageUrl: (prev[effectiveInputId]?.baseImageUrl || attachments.baseImageUrl), referenceImageUrls: (prev[effectiveInputId]?.referenceImageUrls || attachments.referenceImageUrls || []), surroundingUrls: [...(prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), res.originalUrl], wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                          }
                        }
                      }}
                      onDropUrl={(url: string) => {
                        setAttachments(prev => ({ ...prev, surroundingUrls: [...(prev.surroundingUrls || []), url] }));
                        setAttachmentImages(prev => ({ ...prev, surroundingUrls: [...(prev.surroundingUrls || []), url] }));
                        if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), surroundingUrls: [...(prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), url], wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                      }}
                      onRemoveAt={(index: number) => {
                        setAttachments(prev => ({ ...prev, surroundingUrls: (prev.surroundingUrls || []).filter((_, i) => i !== index) }));
                        setAttachmentImages(prev => ({ ...prev, surroundingUrls: (prev.surroundingUrls || []).filter((_, i) => i !== index) }));
                        if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []).filter((_, i) => i !== index), wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []) } }));
                      }}
                    />
                    <MultiUploadTile 
                      label="Walls" 
                      imageUrls={attachmentImages.wallsUrls || []}
                      onSelectFiles={async (files: File[]) => {
                        for (const file of files) {
                          const action = await dispatch(uploadInputImage({ file, uploadSource: 'GALLERY_UPLOAD' }));
                          if (uploadInputImage.fulfilled.match(action)) {
                            const res = action.payload as any;
                            setAttachments(prev => ({ ...prev, wallsUrls: [...(prev.wallsUrls || []), res.originalUrl] }));
                            setAttachmentImages(prev => ({ ...prev, wallsUrls: [...(prev.wallsUrls || []), res.thumbnailUrl || res.originalUrl] }));
                            if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), baseImageUrl: (prev[effectiveInputId]?.baseImageUrl || attachments.baseImageUrl), referenceImageUrls: (prev[effectiveInputId]?.referenceImageUrls || attachments.referenceImageUrls || []), surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: [...(prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []), res.originalUrl] } }));
                          }
                        }
                      }}
                      onDropUrl={(url: string) => {
                        setAttachments(prev => ({ ...prev, wallsUrls: [...(prev.wallsUrls || []), url] }));
                        setAttachmentImages(prev => ({ ...prev, wallsUrls: [...(prev.wallsUrls || []), url] }));
                        if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: [...(prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []), url] } }));
                      }}
                      onRemoveAt={(index: number) => {
                        setAttachments(prev => ({ ...prev, wallsUrls: (prev.wallsUrls || []).filter((_, i) => i !== index) }));
                        setAttachmentImages(prev => ({ ...prev, wallsUrls: (prev.wallsUrls || []).filter((_, i) => i !== index) }));
                        if (effectiveInputId) setAttachmentsByBase(prev => ({ ...prev, [effectiveInputId]: { ...(prev[effectiveInputId] || {}), surroundingUrls: (prev[effectiveInputId]?.surroundingUrls || attachments.surroundingUrls || []), wallsUrls: (prev[effectiveInputId]?.wallsUrls || attachments.wallsUrls || []).filter((_, i) => i !== index) } }));
                      }}
                    />
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ContextToolbar 
          onCreateRegions={handleCreateRegions}
          onSubmit={async (userPrompt, contextSelection, attachmentsParam, options) => {
            // Sync local mask inputs to Redux before submission
            Object.entries(localMaskInputs).forEach(([maskId, displayName]) => {
              dispatch(setMaskInput({ 
                maskId: parseInt(maskId), 
                value: { 
                  displayName: displayName.trim(),
                  imageUrl: maskInputs[parseInt(maskId)]?.imageUrl || null,
                  category: maskInputs[parseInt(maskId)]?.category || ''
                }
              }));
            });
            
            // Update Redux store with current prompt before submission
            dispatch(setSavedPrompt(userPrompt));
            
            // Start generation timer with a temporary batch ID
            // We'll get the real batch ID from the response or websocket
            const tempBatchId = Date.now(); // Temporary ID until we get real one
            startGeneration(tempBatchId);
            
            try {
              await handleSubmit(userPrompt, contextSelection, attachmentsParam || attachments, options);
            } catch (error) {
              // If submission fails, reset generation state
              console.error('Generation submission failed:', error);
              setIsGenerating(false);
              setGenerationStartTime(null);
              setTimeRemaining(null);
              setCurrentBatchId(null);
              
              // Clear timers
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            } finally {
              setIsGenerating(false);
            }
          }}
          userPrompt={prompt}
          attachments={attachments}
          loading={loading || isGenerating}
          generateButtonText="Create"
        />
      </div>
    </div>
  );
};

export default AIPromptInput;

// Lightweight upload tile for placeholders in Create modal
const UploadTile: React.FC<{ 
  label: string; 
  onSelect?: (file: File) => void; 
  imageUrl?: string;
  onClear?: () => void;
}> = ({ label, onSelect, imageUrl, onClear }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div
      className="h-28 rounded-lg border-2 border-dashed border-white/40 flex items-center justify-center text-white/90 hover:border-white/70 transition-colors relative overflow-hidden bg-black/20"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/') && onSelect) onSelect(file);
      }}
      title={label}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={label} className="w-full h-full object-contain" />
          {onClear && (
            <button
              className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-black/90 transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              title="Remove image"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center">
            <span className="text-lg leading-none">+</span>
          </div>
          <span className="text-xs uppercase tracking-wide text-white/90 text-center px-2">{label}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && onSelect) onSelect(file);
        // Clear the input so the same file can be selected again
        if (e.target) e.target.value = '';
      }} />
    </div>
  );
};