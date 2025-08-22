import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sofa, Home, Camera, LayoutList, Sparkles, Zap } from 'lucide-react';

interface ContextToolbarProps {
  onSubmit: (userPrompt: string, contextSelection: string) => Promise<void> | void;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
  userPrompt?: string; // Current user prompt
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({ onSubmit, setIsPromptModalOpen, loading = false, userPrompt = '' }) => {
  const [activeView, setActiveView] = useState('exterior');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    
    if (isSubmitting || loading) return; // Prevent multiple clicks
    
    setIsSubmitting(true); // Set immediate loading state
    
    try {
      await onSubmit(userPrompt, activeView);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };
  
  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault(); // Prevent form submission
        e.stopPropagation();
      }}
      className="bg-[#323232] rounded-lg absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
    >
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
              type="button" // Explicitly set type to prevent form submission
              className="bg-black text-white"
              onClick={() => setIsPromptModalOpen(true)}
            >
              <Zap className="h-4 w-4" />
            </Button>
            {/* Create button with loading state */}
            <Button 
              type="button" // Explicitly set type to prevent form submission
              className="bg-black text-white"
              onClick={handleSubmit}
              disabled={loading || isSubmitting}
            >
              {(loading || isSubmitting) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
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
      type="button" // Explicitly set type to prevent form submission
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