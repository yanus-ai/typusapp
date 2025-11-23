import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sofa, Home, Camera, LayoutList, Sparkles, Zap } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import LightTooltip from '../ui/light-tooltip';

interface ContextToolbarProps {
  onSubmit: (userPrompt: string, contextSelection: string) => Promise<void> | void;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
  generateButtonText?: string; // Text for the generate button, defaults to "Create"
  userPrompt?: string; // Current user prompt
}

const ContextToolbar: React.FC<ContextToolbarProps> = ({ onSubmit, setIsPromptModalOpen, loading = false, userPrompt = '', generateButtonText = 'Create' }) => {
  const [activeView, setActiveView] = useState('exterior');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { variations } = useAppSelector(state => state.customization);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    
    if (isSubmitting || loading) return; // Prevent multiple clicks
    
    setIsSubmitting(true); // Set immediate loading state
    
    try {
      await onSubmit(userPrompt, activeView);
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
        e.preventDefault(); // Prevent form submission
        e.stopPropagation();
      }}
      className="bg-black/30 backdrop-blur-md border border-white/30 rounded-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 shadow-2xl p-2"
      style={{ 
        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* View options */}
      <div className="flex p-1 justify-center">
        <div className="rounded-none px-1 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <LightTooltip text='View Mode' direction='top'>
              <ViewButton 
                icon={<Home size={16} />} 
                label="Exterior"
                active={activeView === 'exterior'}
                onClick={() => setActiveView('exterior')}
              />
            </LightTooltip>
            <LightTooltip text='View Mode' direction='top'>
              <ViewButton 
                icon={<Sofa size={16} />} 
                label="Interior"
                active={activeView === 'interior'}
                onClick={() => setActiveView('interior')}
              />
            </LightTooltip>
            <LightTooltip text='View Mode' direction='top'>
              <ViewButton 
                icon={<Camera size={16} />} 
                label="Aerial" 
                active={activeView === 'aerial'}
                onClick={() => setActiveView('aerial')}
              />
            </LightTooltip>
            <LightTooltip text='View Mode' direction='top'>
              <ViewButton 
                icon={<LayoutList size={16} />} 
                label="Elevation"
                active={activeView === 'elevation'}
                onClick={() => setActiveView('elevation')}
              />
            </LightTooltip>
          </div>

          <div className="border-e border-2 h-1/2 border-white rounded-none"></div>

          <div className="flex gap-2">
            <LightTooltip text='Enable Turbo' direction='top'>
              <Button 
                type="button" // Explicitly set type to prevent form submission
                className="bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-all duration-200 backdrop-blur-sm !py-6 !px-4"
                style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
                onClick={() => setIsPromptModalOpen(true)}
              >
                <Zap className="h-4 w-4" />
              </Button>
            </LightTooltip>
            {/* Create button with loading state */}
            <Button 
              type="button" // Explicitly set type to prevent form submission
              className="bg-transparent border border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-all duration-200 disabled:opacity-100 disabled:cursor-not-allowed backdrop-blur-sm !py-6"
              style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
              onClick={handleSubmit}
              disabled={loading || isSubmitting}
            >
              {(loading || isSubmitting) ? (
                <>
                  <DotLottieReact
                    src={squareSpinner}
                    loop
                    autoplay
                    style={{ height: 35, width: 50 }}
                  />
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {generateButtonText}
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
      className={`flex items-center px-4 py-4 rounded-none text-sm h-auto text-white transition-all duration-200 ${
        active 
          ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/50' 
          : 'bg-transparent hover:bg-white/10 border border-transparent hover:border-white/30'
      }`}
      style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}
      onClick={onClick}
    >
      <span>{icon}</span>
      {label}
    </Button>
  );
};

export default ContextToolbar;