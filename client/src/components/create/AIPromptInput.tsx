import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, X, } from 'lucide-react';

interface AIPromptInputProps {
  onSubmit: (prompt: string) => void;
  setIsPromptModalOpen: (isOpen: boolean) => void;
  loading?: boolean;
  error?: string | null;
}

const AIPromptInput: React.FC<AIPromptInputProps> = ({ onSubmit, setIsPromptModalOpen }) => {
  const [prompt, setPrompt] = useState('CREATE AN ARCHITECTURAL VISUALIZATION OF AVANT-GARDE INNOVATIVE INDUSTRIAL');

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt);
    }
  };
  
  return (
    <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-50 backdrop-blur-xs">
        {/* Modal content */}
        <div className="rounded-lg w-full max-w-5xl mx-4 overflow-hidden relative h-full">
          {/* Close button in the top-right corner */}
          <button 
            className="absolute top-10 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => setIsPromptModalOpen(false)}
          >
            <X className="h-8 w-8 text-gray-500" />
          </button>
          
          <div className="p-4 h-full flex flex-col justify-center">
            <div className="p-3">
              <div className="max-w-[500px] mx-auto">
                <textarea
                  id='prompt-input'
                  rows={10}
                  className="text-white w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2"
                  placeholder="Describe the architectural visualization you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                />
                <Button 
                  className="bg-white text-black mt-4 w-full flex items-center justify-center gap-2 border border-white hover:text-white"
                  onClick={handleSubmit}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};


export default AIPromptInput;