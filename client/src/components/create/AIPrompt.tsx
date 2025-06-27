import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sofa, Home, Camera, LayoutList, Wand2, X, Sparkles, Zap } from 'lucide-react';

interface AIPromptInputProps {
  onSubmit: (prompt: string) => void;
}

const AIPromptInput: React.FC<AIPromptInputProps> = ({ onSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [activeView, setActiveView] = useState('exterior');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt);
    }
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
              onClick={() => setIsPromptModalOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Create
            </Button>
          </div>

        </div>
      </div>

      {/* Modal overlay */}
      {isPromptModalOpen && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          {/* Modal content */}
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden relative">
            {/* Close button in the top-right corner */}
            <button 
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setIsPromptModalOpen(false)}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Create with AI</h3>
              <p className="text-sm text-gray-500">
                Describe the architectural visualization you want to generate
              </p>
            </div>
            
            <div className="p-4">
              <div className="flex p-3">
                <div className="relative flex-1 mr-2">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the architectural visualization you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmit();
                      }
                    }}
                  />
                </div>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  onClick={handleSubmit}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsPromptModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
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

export default AIPromptInput;