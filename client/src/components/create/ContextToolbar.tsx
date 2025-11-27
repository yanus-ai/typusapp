import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Layers2, Plus } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import { setVariations, setSelectedStyle } from '@/features/customization/customizationSlice';
import toast from 'react-hot-toast';

interface ContextToolbarProps {
  onSubmit: (userPrompt: string, contextSelection: string, attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] }, options?: { size?: string; aspectRatio?: string }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  generateButtonText?: string; // Text for the generate button, defaults to "Create"
  userPrompt?: string; // Current user prompt
  attachments?: { baseImageUrl?: string; referenceImageUrls?: string[]; surroundingUrls?: string[]; wallsUrls?: string[] };
  onCreateRegions?: () => void; // Handler for create regions button
  variations?: number; // Number of variations (for future use)
  onVariationsChange?: (variations: number) => void; // Handler for variations change (for future use)
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({ 
  onSubmit, 
  loading = false, 
  userPrompt = '', 
  generateButtonText = 'Create', 
  attachments,
  onCreateRegions
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [size, setSize] = useState('2K');
  const [showSettings, setShowSettings] = useState(false);
  const [creativity, setCreativity] = useState(4);
  const [expressivity, setExpressivity] = useState(2);
  const [resemblance, setResemblance] = useState(6);
  
  const dispatch = useAppDispatch();
  const selectedModel = useAppSelector(state => state.tweak.selectedModel);
  const selectedVariations = useAppSelector(state => state.customization.variations);
  const selectedStyle = useAppSelector(state => state.customization.selectedStyle);

  // Ensure the displayed value is always a valid option (not SDXL)
  const displayModel = selectedModel === "sdxl" ? "nanobananapro" : selectedModel;

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    
    if (isSubmitting || loading) return; // Prevent multiple clicks
    
    setIsSubmitting(true); // Set immediate loading state
    
    try {
      await onSubmit(userPrompt, 'exterior', attachments, { size, aspectRatio });
    } catch (error: any) {
      console.error('Error in ContextToolbar handleSubmit:', error);
      // Note: Error handling moved to CreatePage handleSubmit function
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };
  
  return (
    <form
  onSubmit={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
  className="bg-black/40 backdrop-blur-md border border-white/30 rounded-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 shadow-xl px-3 py-2 w-[90%] max-w-5xl"
  style={{
    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
    boxShadow:
      '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  }}
>
  {/* Main Toolbar - Compact Responsive Grid */}
  <div className="grid grid-cols-8 gap-2 items-end justify-between w-full">
    {/* Each item has its own dropdown + label below */}

    {/* 1️⃣ Generate Regions */}
    <div className="flex flex-col items-center">
      <Button
        type="button"
        className="w-full bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-all duration-200 backdrop-blur-sm !py-2 !px-3 flex items-center justify-center gap-1 text-xs"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔵🔵🔵 Generate Regions BUTTON CLICKED!', { 
            onCreateRegions: !!onCreateRegions,
            onCreateRegionsType: typeof onCreateRegions
          });
          if (onCreateRegions) {
            try {
              await onCreateRegions();
            } catch (error) {
              console.error('❌ Error in onCreateRegions:', error);
            }
          } else {
            console.error('❌❌❌ onCreateRegions handler is NOT PROVIDED!');
            toast.error('Create Regions handler not available. Please refresh the page.');
          }
        }}
      >
        <Layers2 className="h-3 w-3" />
        Generate
      </Button>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">
        Regions
      </label>
    </div>

    {/* 2️⃣ Style (Photorealistic / Art) */}
    <div className="flex flex-col items-center">
      <select
        value={selectedStyle}
        onChange={(e) => {
          dispatch(setSelectedStyle(e.target.value as 'photorealistic' | 'art'));
        }}
        className="w-full px-2 py-1.5 rounded text-xs border border-white/40 bg-black text-white focus:ring-1 focus:ring-white/60 transition-all appearance-none"
      >
        <option value="photorealistic">Photorealistic</option>
        <option value="art">Art</option>
      </select>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">
        Style
      </label>
    </div>

    {/* 3️⃣ Settings (Button + dropdown) */}
    <div className="flex flex-col items-center relative">
      <Button
        type="button"
        className="w-full bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-all duration-200 backdrop-blur-sm !py-2 !px-3 flex items-center justify-center gap-1 text-xs"
        onClick={() => setShowSettings(v => !v)}
      >
        Settings
      </Button>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">Settings</label>

      {showSettings && (
        <div className="absolute bottom-[52px] left-1/2 -translate-x-1/2 bg-black/80 border border-white/30 rounded-none p-3 w-64 shadow-2xl backdrop-blur-md z-50" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[11px] text-white/90">
            <span>Creativity</span>
            <span className="ml-2">{creativity}</span>
          </div>
          <input type="range" min={0} max={6} step={1} value={creativity} onChange={(e) => setCreativity(parseInt(e.target.value))} className="w-full" />

          <div className="flex items-center justify-between text-[11px] text-white/90 mt-2">
            <span>Expressivity</span>
            <span className="ml-2">{expressivity}</span>
          </div>
          <input type="range" min={0} max={6} step={1} value={expressivity} onChange={(e) => setExpressivity(parseInt(e.target.value))} className="w-full" />

          <div className="flex items-center justify-between text-[11px] text-white/90 mt-2">
            <span>Resemblance</span>
            <span className="ml-2">{resemblance}</span>
          </div>
          <input type="range" min={0} max={6} step={1} value={resemblance} onChange={(e) => setResemblance(parseInt(e.target.value))} className="w-full" />
        </div>
      )}
    </div>

    {/* 4️⃣ Variants */}
    <div className="flex flex-col items-center">
      <select
        value={selectedVariations}
        onChange={(e) => dispatch(setVariations(parseInt(e.target.value)))}
        className="w-full px-2 py-1.5 rounded text-xs border border-white/40 bg-black text-white focus:ring-1 focus:ring-white/60 transition-all appearance-none"
      >
        {[1, 2, 3, 4].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide text-center leading-tight">
        Variants
      </label>
    </div>

    {/* 5️⃣ Model */}
    <div className="flex flex-col items-center">
      <select
        value={displayModel}
        onChange={(e) => dispatch({ type: 'tweak/setSelectedModel', payload: e.target.value })}
        className="w-full px-2 py-1.5 rounded text-xs border border-white/40 bg-black text-white focus:ring-1 focus:ring-white/60 transition-all appearance-none"
      >
        <option value="nanobananapro">Nano Banana Pro</option>
        <option value="seedream4">Seedream 4</option>
        <option value="sdxl">SDXL</option>
      </select>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">
        Model
      </label>
    </div>

    {/* 6️⃣ Size */}
    <div className="flex flex-col items-center">
      <select
        value={size}
        onChange={(e) => setSize(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-xs border border-white/40 bg-black text-white focus:ring-1 focus:ring-white/60 transition-all appearance-none"
      >
        <option value="1K">1K</option>
        <option value="2K">2K</option>
        {/* Temporary disabled 4K for Seedream 4 */}
        <option value="4K" disabled={selectedModel === "seedream4"}>4K</option>
      </select>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">
        Size
      </label>
    </div>

    {/* 7️⃣ Aspect Ratio */}
    <div className="flex flex-col items-center">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full px-2 py-1.5 rounded text-xs border border-white/40 bg-black text-white focus:ring-1 focus:ring-white/60 transition-all appearance-none"
            >
              <option value="match_input_image">Match Input</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide text-center">
        Aspect
      </label>
    </div>

    {/* 8️⃣ Create Button */}
    <div className="flex flex-col items-center">
      <Button
        type="button"
        className="w-full bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-all duration-200 disabled:opacity-100 disabled:cursor-not-allowed backdrop-blur-sm !py-2 flex items-center justify-center gap-1.5 !px-3"
        onClick={handleSubmit}
        disabled={loading || isSubmitting}
      >
        {loading || isSubmitting ? (
          <DotLottieReact
            src={loader}
            loop
            autoplay
            style={{ transform: 'scale(3)', height: 16, width: 16 }}
          />
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">{generateButtonText}</span>
          </>
        )}
      </Button>
      <label className="text-[10px] mt-1 text-white/70 uppercase tracking-wide">
        Generate
      </label>
    </div>
  </div>
</form>


  );
};


export default ContextToolbar;