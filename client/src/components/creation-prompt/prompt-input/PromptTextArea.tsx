import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setSavedPrompt, generateAIPrompt } from "@/features/masks/maskSlice";
import { WandSparkles } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { useState } from "react";
import toast from "react-hot-toast";

export function PromptTextArea() {
  const { savedPrompt } = useAppSelector(state => state.masks);
  const { inputImageId } = useAppSelector(state => state.customization);
  const dispatch = useAppDispatch();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (newValue: string) => {
    dispatch(setSavedPrompt(newValue));
  }

  const handleRandomPrompt = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Random architectural style keywords
      const styles = [
        'Avant-Garde Innovative Industrial',
        'Modern Minimalist Contemporary',
        'Brutalist Concrete Architecture',
        'Futuristic Sustainable Design',
        'Classical Elegant Structure',
        'Organic Biophilic Architecture',
        'Postmodern Eclectic Building',
        'High-Tech Glass Facade',
        'Vernacular Regional Design',
        'Deconstructivist Geometric Form'
      ];
      
      // Random materials (2-3 materials)
      const materials = [
        'WOOD', 'CONCRETE', 'METAL', 'GLASS', 'STONE', 
        'MARBLE', 'STEEL', 'BRICK', 'PLASTER', 'CERAMICS', 
        'TERRAZZO', 'LIGHTING'
      ];
      
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const shuffledMaterials = materials.sort(() => 0.5 - Math.random());
      const selectedMaterials = shuffledMaterials.slice(0, Math.floor(Math.random() * 2) + 2); // 2-3 materials
      const materialsText = selectedMaterials.join(', ');
      
      // Use inputImageId if available, otherwise generate without it
      if (inputImageId) {
        const result = await dispatch(generateAIPrompt({
          inputImageId: inputImageId,
          userPrompt: `Create an Architectural Visualization of ${randomStyle}`,
          materialsText: materialsText,
          includeSelectedMaterials: false
        })).unwrap();
        
        if (result.data?.generatedPrompt) {
          dispatch(setSavedPrompt(result.data.generatedPrompt));
          toast.success('Random prompt generated!');
        }
      } else {
        // Fallback: Generate a simple random prompt without API call
        const fallbackPrompts = [
          `Create an Architectural Visualization of ${randomStyle} featuring ${materialsText.toLowerCase()} materials with ultra-realistic details, clear contours, resembling a high-quality photograph taken with a Canon 5D. Octane rendering enhances the realism, with a view in 8K resolution for the highest level of detail.`,
          `Generate an architectural visualization showcasing ${randomStyle} design principles, incorporating ${materialsText.toLowerCase()} elements. The visualization should feature ultra-realistic details, crisp lines, and professional photography quality with Canon 5D aesthetics and Octane rendering in 8K resolution.`,
          `Create a stunning architectural visualization of ${randomStyle} architecture using ${materialsText.toLowerCase()} materials. The design should exhibit ultra-realistic rendering with clear contours, high detail photography style, Canon 5D quality, and Octane rendering at 8K resolution for maximum visual impact.`
        ];
        
        const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
        dispatch(setSavedPrompt(randomPrompt));
        toast.success('Random prompt generated!');
      }
    } catch (error: any) {
      console.error('Failed to generate random prompt:', error);
      toast.error(error?.message || 'Failed to generate random prompt');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="relative w-full">
      {/* WandSparkles icon on the left */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <LightTooltip text="Generate Random Prompt" direction="top">
          <button
            className={`p-2 border border-transparent hover:border-gray-200 shadow-sm bg-white hover:bg-gray-50 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="button"
            onClick={handleRandomPrompt}
            disabled={isGenerating}
            aria-label="Generate Random Prompt"
          >
            <WandSparkles 
              size={18} 
              className={`text-gray-700 transition-transform ${isGenerating ? 'animate-pulse' : 'hover:scale-110'}`} 
            />
          </button>
        </LightTooltip>
      </div>
      
      <textarea
        className="mb-0 min-h-14! h-14 w-full flex-1 resize-none border-none bg-transparent pl-12 pr-1.5 pt-0.5 pb-0 text-black outline-none placeholder:text-neutral-400 hover:resize-y sm:h-14"
        name="prompt"
        aria-label="Prompt"
        value={savedPrompt || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Create an Architectural Visualization of Avant-Garde Innovative Industrial"
      />
    </div>
  )
}