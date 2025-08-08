import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Settings, Sparkles, Download, Eye, ScanLine, Columns2, Zap } from 'lucide-react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  updateSettings,
  updateResolution,
  updateScaleFactor,
  updateAIStrength,
  updateResemblance,
  updateClarity,
  updateSharpness,
  toggleMatchColor,
  setViewMode,
  generateRefine
} from '@/features/refine/refineSlice';
import SliderSection from '../create/SliderSection';
import RefineGeneratedImagesPanel from './RefineGeneratedImagesPanel';

interface RefineEditInspectorProps {
  selectedImageId: number | null;
  selectedImageUrl: string | null;
  editInspectorMinimized: boolean;
  setEditInspectorMinimized: (minimized: boolean) => void;
}

const RefineEditInspector: React.FC<RefineEditInspectorProps> = ({
  selectedImageId,
  selectedImageUrl,
  editInspectorMinimized,
  setEditInspectorMinimized
}) => {
  const dispatch = useAppDispatch();

  // Redux selectors
  const {
    settings,
    operations,
    loadingOperations,
    isGenerating,
    viewMode,
    error
  } = useAppSelector(state => state.refine);

  const handleScaleFactorChange = (scaleFactor: number) => {
    dispatch(updateScaleFactor(scaleFactor));
  };

  const handleSliderChange = (type: string, value: number) => {
    switch (type) {
      case 'aiStrength':
        dispatch(updateAIStrength(value));
        break;
      case 'resemblance':
        dispatch(updateResemblance(value));
        break;
      case 'clarity':
        dispatch(updateClarity(value));
        break;
      case 'sharpness':
        dispatch(updateSharpness(value));
        break;
    }
  };

  const handleResolutionChange = (width: number, height: number) => {
    dispatch(updateResolution({ width, height }));
  };

  const handleViewModeChange = (mode: 'generated' | 'before-after' | 'side-by-side') => {
    dispatch(setViewMode(mode));
  };

  const handleGenerate = async () => {
    if (!selectedImageId || !selectedImageUrl) return;

    try {
      await dispatch(generateRefine({
        imageId: selectedImageId,
        imageUrl: selectedImageUrl,
        settings,
        variations: 1
      })).unwrap();
    } catch (error) {
      console.error('Failed to generate refine:', error);
    }
  };

  const handleImageSelect = (imageUrl: string, operationId: number) => {
    // This could be used to preview the refined image or set it as current
    console.log('Selected refined image:', imageUrl, operationId);
  };

  const downloadCurrentImage = async () => {
    if (!selectedImageUrl) return;

    // Find the latest completed operation
    const latestCompleted = operations
      .filter(op => op.status === 'COMPLETED' && op.processedImageUrl)
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())[0];

    const imageUrl = latestCompleted?.processedImageUrl || selectedImageUrl;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `yanus-refined-${selectedImageId || Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const resolutionPresets = [
    { label: '1K', width: 1024, height: 1024 },
    { label: '2K', width: 2048, height: 2048 },
    { label: '4K', width: 4096, height: 4096 },
  ];

  return (
    <div className={`shadow-lg h-full bg-gray-100 w-[322px] flex flex-col rounded-md custom-scrollbar transition-all ${editInspectorMinimized ? 'translate-y-[calc(100vh-122px)] absolute right-[20px]' : 'translate-y-0'}`}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center cursor-pointer" onClick={() => setEditInspectorMinimized(!editInspectorMinimized)}>
        <h2 className="font-medium flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Refine Inspector
        </h2>
        <Button variant="ghost" size="icon">
          {editInspectorMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1 my-2">
        {/* Image Preview */}
        <div className="p-4">
          <div className="relative rounded-md overflow-hidden h-[170px] w-[274px] bg-gray-200">
            {selectedImageUrl ? (
              <img 
                src={selectedImageUrl} 
                alt="Selected image for refining" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-300 select-none">
                <span className="text-gray-500">No Image Selected</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button 
                size="icon" 
                variant="secondary" 
                className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg"
                onClick={downloadCurrentImage}
                disabled={!selectedImageUrl}
                title="Download Image"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* View Mode Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">View Mode</h3>
          <div className="grid grid-cols-3 gap-1 bg-[#EFECEC] rounded-xl p-1">
            <Button 
              className={`py-1.5 px-2 rounded-lg text-xs ${
                viewMode === 'generated' 
                  ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
              }`}
              onClick={() => handleViewModeChange('generated')}
              title="Generated View"
            >
              <Eye className="w-3 h-3 mr-1" />
              Generated
            </Button>
            <Button
              className={`py-1.5 px-2 rounded-lg text-xs ${
                viewMode === 'before-after' 
                  ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
              }`}
              onClick={() => handleViewModeChange('before-after')}
              title="Before/After Comparison"
            >
              <ScanLine className="w-3 h-3 mr-1" />
              Compare
            </Button>
            <Button
              className={`py-1.5 px-2 rounded-lg text-xs ${
                viewMode === 'side-by-side' 
                  ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
              }`}
              onClick={() => handleViewModeChange('side-by-side')}
              title="Side by Side View"
            >
              <Columns2 className="w-3 h-3 mr-1" />
              Split
            </Button>
          </div>
        </div>

        {/* Scale Factor Selection */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Scale Factor</h3>
          <div className="flex gap-1 bg-[#EFECEC] rounded-xl p-1">
            {[1, 2, 3, 4].map((scale) => (
              <Button 
                key={scale}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs ${
                  settings.scaleFactor === scale 
                    ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
                }`}
                onClick={() => handleScaleFactorChange(scale)}
              >
                {scale}x
              </Button>
            ))}
          </div>
        </div>

        {/* Resolution Presets */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Resolution</h3>
          <div className="flex gap-1 bg-[#EFECEC] rounded-xl p-1">
            {resolutionPresets.map((preset) => (
              <Button 
                key={preset.label}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs ${
                  settings.resolution.width === preset.width && settings.resolution.height === preset.height
                    ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
                }`}
                onClick={() => handleResolutionChange(preset.width, preset.height)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Strength Slider */}
        <SliderSection 
          title="AI Strength" 
          value={settings.aiStrength} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleSliderChange('aiStrength', value)} 
        />

        {/* Resemblance Slider */}
        <SliderSection 
          title="Resemblance" 
          value={settings.resemblance} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleSliderChange('resemblance', value)} 
        />

        {/* Clarity Slider */}
        <SliderSection 
          title="Clarity" 
          value={settings.clarity} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleSliderChange('clarity', value)} 
        />

        {/* Sharpness Slider */}
        <SliderSection 
          title="Sharpness" 
          value={settings.sharpness} 
          minValue={1} 
          maxValue={50} 
          onChange={(value) => handleSliderChange('sharpness', value)} 
        />

        {/* Match Color Toggle */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Color Matching</h3>
          <div className="flex bg-[#EFECEC] rounded-xl p-1">
            <Button 
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs ${
                settings.matchColor 
                  ? 'bg-white text-black hover:bg-white hover:text-black shadow-sm' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-200/50 hover:text-gray-600 shadow-none'
              }`}
              onClick={() => dispatch(toggleMatchColor())}
            >
              {settings.matchColor ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>

        {/* Generate Button */}
        <div className="px-4 pb-4">
          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
            onClick={handleGenerate}
            disabled={!selectedImageId || !selectedImageUrl || isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Refining...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Refine Image
              </div>
            )}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          </div>
        )}

        {/* Generated Images History */}
        <div className="border-t border-gray-200">
          <RefineGeneratedImagesPanel
            operations={operations}
            loadingOperations={loadingOperations}
            selectedImageId={selectedImageId}
            onImageSelect={handleImageSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default RefineEditInspector;