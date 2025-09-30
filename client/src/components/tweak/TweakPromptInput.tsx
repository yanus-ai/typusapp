import React from 'react';
import { Send } from 'lucide-react';

interface TweakPromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const TweakPromptInput: React.FC<TweakPromptInputProps> = ({
  prompt,
  setPrompt,
  onGenerate,
  disabled = false,
  loading = false
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled && !loading) {
      onGenerate();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to generate or modify..."
            disabled={disabled || loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
            style={{ minHeight: '44px', maxHeight: '100px' }}
          />
          
          {/* Character count indicator */}
          <div className="absolute bottom-1 right-1 text-xs text-gray-400">
            {prompt.length}/500
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || loading || !prompt.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <Send size={16} />
          )}
          <span className="hidden sm:inline">Generate</span>
        </button>
      </form>

      {/* Helpful text */}
      <div className="mt-1 text-xs text-gray-500">
        Enter your prompt and use the tools above to modify specific regions or add images
      </div>
    </div>
  );
};

export default TweakPromptInput;