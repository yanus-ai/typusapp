import React from "react";
import LightTooltip from "@/components/ui/light-tooltip";

interface SessionHistoryPanelItemProps {
  sessionImage: {
    id: number;
    thumbnailUrl?: string;
    sessionName: string;
    batchCount: number;
  };
  isSelected: boolean;
  tooltipText: string;
  onClick: () => void;
  disabled?: boolean;
}

const SessionHistoryPanelItem: React.FC<SessionHistoryPanelItemProps> = ({
  sessionImage,
  isSelected,
  tooltipText,
  onClick
}) => {
  return (
    <LightTooltip text={tooltipText} direction="left">
      <div
        className={`w-full rounded-none overflow-hidden border-2 shadow-none border-gray-100 outline-none ring-0 relative group transition-all cursor-pointer ${
          isSelected ? 'border-2 border-gray-950 shadow-md' : 'border-transparent hover:border-gray-300'
        }`}
        onClick={onClick}
      >
        {sessionImage.thumbnailUrl ? (
          <img
            src={sessionImage.thumbnailUrl}
            alt={tooltipText}
            className="h-[57px] w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full bg-gradient-to-br from-gray-100 to-gray-50 h-[57px] flex flex-col items-center justify-center relative rounded-none overflow-hidden border border-gray-200">
            <div className="text-gray-400 text-xs text-center px-1 font-medium">
              {sessionImage.batchCount || 0} {sessionImage.batchCount === 1 ? 'batch' : 'batches'}
            </div>
          </div>
        )}
      </div>
    </LightTooltip>
  );
};

export default SessionHistoryPanelItem;

