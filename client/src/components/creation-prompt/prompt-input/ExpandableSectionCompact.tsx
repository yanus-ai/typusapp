import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableSectionCompactProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ExpandableSectionCompact: React.FC<ExpandableSectionCompactProps> = ({
  title,
  expanded,
  onToggle,
  children,
}) => {
  return (
    <div className="border border-gray-200 rounded-none overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-2.5 py-1.5 overflow-hidden text-left transition-colors",
          "hover:bg-gray-50 focus:outline-none",
          expanded && "bg-gray-50"
        )}
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-gray-500 transition-transform duration-200 flex-shrink-0",
            expanded && "transform rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-2 py-1.5 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ExpandableSectionCompact;

