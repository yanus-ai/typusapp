import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sofa, Home, Camera, LayoutList, Sparkles, Zap } from 'lucide-react';

interface ContextToolbarProps {
  onSubmit: () => void;
  setIsPromptModalOpen: (isOpen: boolean) => void;
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({ onSubmit, setIsPromptModalOpen }) => {
  const [activeView, setActiveView] = useState('exterior');

  const handleSubmit = () => {
    onSubmit();
  };
  
  return (
    <div className="bg-[#323232] rounded-lg absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      {/* View options */}
      <div className="flex p-1 justify-center">
        <div className="rounded-lg px-1 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <ViewButton 
              icon={<Home size={16} />} 
              label="Exterior"
              active={activeView === 'exterior'}
              onClick={() => setActiveView('exterior')}
            />
            <ViewButton 
              icon={<Sofa size={16} />} 
              label="Interior"
              active={activeView === 'interior'}
              onClick={() => setActiveView('interior')}
            />
            <ViewButton 
              icon={<Camera size={16} />} 
              label="Aerial" 
              active={activeView === 'aerial'}
              onClick={() => setActiveView('aerial')}
            />
            <ViewButton 
              icon={<LayoutList size={16} />} 
              label="Elevation"
              active={activeView === 'elevation'}
              onClick={() => setActiveView('elevation')}
            />
          </div>

          <div className="border-e border-2 h-1/2 border-white rounded-md"></div>

          <div className="flex gap-2">
            <Button 
              className="bg-black text-white"
              onClick={() => setIsPromptModalOpen(true)}
            >
              <Zap className="h-4 w-4" />
            </Button>
            {/* Prompt button to trigger modal */}
            <Button 
              className="bg-black text-white "
              onClick={handleSubmit}
            >
              <Sparkles className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ViewButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ViewButton: React.FC<ViewButtonProps> = ({ icon, label, active, onClick }) => {
  return (
    <Button
      variant={'default'}
      className={`flex items-center px-4 py-4 rounded-lg text-sm h-auto text-white ${
        active 
          ? 'bg-[#191919] text-white hover:bg-[#191919]' 
          : 'bg-transparent hover:bg-white/50'
      }`}
      onClick={onClick}
    >
      <span>{icon}</span>
      {label}
    </Button>
  );
};

export default ContextToolbar;