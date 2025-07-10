import React from "react";
import { ChevronRight } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ title, expanded, onToggle, children }) => {
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

export default ExpandableSection;