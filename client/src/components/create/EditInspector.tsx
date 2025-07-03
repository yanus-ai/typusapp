import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SquarePen, ImageIcon, ChevronRight, Layers2, MinusIcon, Palette, Sparkle, Sparkles } from 'lucide-react';
import StyleOption from './StyleOption';

interface EditInspectorProps {
  imageUrl?: string;
}

const EditInspector: React.FC<EditInspectorProps> = ({ imageUrl }) => {
  const [minimized, setMinimized] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [variations, setVariations] = useState(3);  
  const [creativity, setCreativity] = useState(3);
  const [expressivity, setExpressivity] = useState(3);
  const [resemblance, setResemblance] = useState(3);
  
  // Section expanded states
  const [expandedSections, setExpandedSections] = useState({
    type: true,
    walls: false,
    floors: false,
    context: false,
    style: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };
  
  const toggleMinimize = () => setMinimized(!minimized);
  
  if (minimized) {
    return (
      <div className="h-full bg-gray-100 border-r border-gray-200 w-12 flex flex-col items-center py-4 rounded-md">
        <Button variant="ghost" size="icon" onClick={toggleMinimize}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 border-r border-gray-200 min-w-[321px] flex flex-col rounded-md custom-scrollbar">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-medium">Edit Inspector</h2>
        <Button variant="ghost" size="icon" onClick={toggleMinimize}>
          <MinusIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {/* Image Preview */}
        <div className="p-4">
          <div className="relative rounded-md overflow-hidden h-[170px] w-full bg-gray-200">
            {
              imageUrl 
              ? 
                <img 
                  src={imageUrl} 
                  alt="Current preview" 
                  className="w-full h-full object-cover"
                /> 
              : 
              <div className="absolute inset-0 flex items-center justify-center bg-gray-300 select-none">
                <span className="text-gray-500">No Image</span>
              </div>
            }
            <div className="absolute bottom-2 right-2 flex gap-1">
              <Button size="icon" variant="secondary" className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg">
                <Layers2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="secondary" className="h-7 w-7 text-white !bg-white/10 backdrop-opacity-70 rounded-lg">
                <SquarePen className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Settings */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Settings</h3>
          <div className="flex mb-4 bg-[#EFECEC] rounded-xl">
            <Button 
              className={`w-1/2 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                selectedStyle === 'photorealistic' 
                  ? 'bg-black text-white hover:bg-black hover:text-white' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
              onClick={() => setSelectedStyle('photorealistic')}
            >
              <ImageIcon size={18} />
              Photorealistic
            </Button>
            <Button
              className={`w-1/2 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                selectedStyle === 'art' 
                  ? 'bg-black text-white hover:bg-black hover:text-white' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
              onClick={() => setSelectedStyle('art')}
            >
              <Palette size={18} />
              Art
            </Button>
          </div>
        </div>
        
        {/* Number of Variations */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-medium mb-2">Number of Variations</h3>
          <div className="flex mb-4 bg-[#EFECEC] rounded-xl">
            {[1, 2, 3, 4].map((num) => (
              <Button 
                key={num}
                className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-2 ${
                variations === num 
                  ? 'bg-white text-black hover:bg-white hover:text-black' 
                  : 'bg-transparent text-gray-500 hover:bg-gray-[#EFECEC] hover:text-gray-500 shadow-none'
              }`}
                onClick={() => setVariations(num)}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Creativity */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Creativity</h3>
            <span className="text-xs font-medium bg-white rounded-md py-2 px-2">{creativity}</span>
          </div>
          <div className="flex gap-2">
            <Sparkle size={12} className='text-[#807E7E] flex-shrink-0'/>
            <Slider
              value={[creativity]} 
              min={1} 
              max={5} 
              step={1} 
              onValueChange={(value) => setCreativity(value[0])}
              className="py-1"
            />
            <Sparkles size={12} className='text-[#807E7E] flex-shrink-0'/>
          </div>
        </div>
        
        {/* Expressivity */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Expressivity</h3>
            <span className="text-xs font-medium bg-white rounded-md py-2 px-2">{expressivity}</span>
          </div>
          <div className="flex gap-2">
            <Sparkle size={12} className='text-[#807E7E] flex-shrink-0'/>
            <Slider
              value={[expressivity]} 
              min={1} 
              max={5} 
              step={1} 
              onValueChange={(value) => setExpressivity(value[0])}
              className="py-1"
            />
            <Sparkles size={12} className='text-[#807E7E] flex-shrink-0'/>
          </div>
        </div>
        
        {/* Resemblance */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Resemblance</h3>
            <span className="text-xs font-medium bg-white rounded-md py-2 px-2">{resemblance}</span>
          </div>
          <div className="flex gap-2">
            <Sparkle size={12} className='text-[#807E7E] flex-shrink-0'/>
            <Slider
              value={[resemblance]} 
              min={1} 
              max={5} 
              step={1} 
              onValueChange={(value) => setResemblance(value[0])}
              className="py-1"
            />
            <Sparkles size={12} className='text-[#807E7E] flex-shrink-0'/>
          </div>
        </div>
        
        {/* Expandable Sections */}
        <ExpandableSection 
          title="Type" 
          expanded={expandedSections.type} 
          onToggle={() => toggleSection('type')} 
        />
        
        <ExpandableSection 
          title="Walls" 
          expanded={expandedSections.walls} 
          onToggle={() => toggleSection('walls')} 
        />
        
        <ExpandableSection 
          title="Floors" 
          expanded={expandedSections.floors} 
          onToggle={() => toggleSection('floors')} 
        />
        
        <ExpandableSection 
          title="Context" 
          expanded={expandedSections.context} 
          onToggle={() => toggleSection('context')} 
        >
          <div className="grid grid-cols-3 gap-2 pb-4">
            <StyleOption 
              imageUrl="/images/style-art-deco.jpg"
              title="Art Deco"
              selected={false}
              onSelect={() => {}}
            />
            <StyleOption 
              imageUrl="/images/style-art-nouveau.jpg"
              title="ART NOUVEAU"
              selected={false}
              onSelect={() => {}}
            />
            <StyleOption 
              imageUrl="/images/style-bauhaus.jpg"
              title="BAUHAUS"
              selected={false}
              onSelect={() => {}}
            />
          </div>
        </ExpandableSection>
        
        <ExpandableSection 
          title="Style" 
          expanded={expandedSections.style} 
          onToggle={() => toggleSection('style')} 
        >
          <div className="grid grid-cols-3 gap-2 pb-4">
            <StyleOption 
              imageUrl="/images/style-art-deco.jpg"
              title="Art Deco"
              selected={false}
              onSelect={() => {}}
            />
            <StyleOption 
              imageUrl="/images/style-art-nouveau.jpg"
              title="ART NOUVEAU"
              selected={false}
              onSelect={() => {}}
            />
            <StyleOption 
              imageUrl="/images/style-bauhaus.jpg"
              title="BAUHAUS"
              selected={false}
              onSelect={() => {}}
            />
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
};

interface ExpandableSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const ExpandableSection = ({ title, expanded, onToggle, children }: ExpandableSectionProps) => {
  return (
    <div className="px-4 border-t border-gray-200">
      <div 
        className="py-3 flex justify-between items-center cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="text-sm font-medium">{title}</h3>
        <ChevronRight 
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} 
        />
      </div>
      {expanded && children && <div>{children}</div>}
    </div>
  );
};

export default EditInspector;