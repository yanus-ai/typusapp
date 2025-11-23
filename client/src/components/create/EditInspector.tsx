import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import MaterialCustomizationSettings from './MaterialCustomizationSettings';

interface EditInspectorProps {
  inputImageId?: number;
  editInspectorMinimized: boolean;
  setEditInspectorMinimized: (editInspectorMinimized: boolean) => void;
}

const EditInspector: React.FC<EditInspectorProps> = ({ inputImageId, editInspectorMinimized, setEditInspectorMinimized }) => {
  // Keep access to style for MaterialCustomizationSettings
  const { selectedStyle } = useAppSelector(state => state.customization);

  // Helper function to render the Generate Regions button
  const renderGenerateRegionsButton = () => {
    const canGenerate = imageUrl && maskStatus !== 'processing';
    const hasExistingMasks = maskStatus === 'completed' && masks.length > 0;

    return (
      <Button 
        variant={'ghost'}
        className="text-xs w-full bg-white cursor-pointer shadow-sm hover:shaddow-md"
        onClick={handleGenerateRegions}
        disabled={!canGenerate || masksLoading}
        title={hasExistingMasks ? `View ${masks.length} Regions` : "Generate Regions"}
      >
        {masksLoading || maskStatus === 'processing' ? (
          <DotLottieReact
            src={squareSpinner}
            autoplay
            loop
            style={{ width: 16, height: 16 }}
          />
        ) : (
          <Layers2 className="h-4 w-4" />
        )}
        <span>
          Generate Regions
        </span>
      </Button>
    );
  };

  return (
    <div className={`h-full bg-site-white w-[322px] flex flex-col rounded-none custom-scrollbar transition-all z-100 ${editInspectorMinimized ? 'translate-y-[calc(100vh-122px)] absolute left-[100px]' : 'translate-y-0'}`}>
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setEditInspectorMinimized(!editInspectorMinimized)}>
        <h2 className="font-medium">Edit Inspector</h2>
        <div>
          {editInspectorMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1 my-2">
        {/* Keep only categories list */}
        <div className="px-4 pb-4">
          <MaterialCustomizationSettings
            selectedStyle={selectedStyle}
            inputImageId={inputImageId}
          />
        </div>
      </div>
    </div>
  );
};

export default EditInspector;