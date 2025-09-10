import React from 'react';
import { PlusSquare, Edit3, Sparkles } from 'lucide-react';

interface CrossModuleBadgesProps {
  createUploadId?: number;
  tweakUploadId?: number;
  refineUploadId?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const CrossModuleBadges: React.FC<CrossModuleBadgesProps> = ({
  createUploadId,
  tweakUploadId,
  refineUploadId,
  size = 'sm',
  className = ''
}) => {
  const badges = [];

  if (createUploadId) {
    badges.push({
      key: 'create',
      icon: PlusSquare,
      label: 'Used in Create',
      color: 'bg-blue-100 text-blue-700'
    });
  }

  if (tweakUploadId) {
    badges.push({
      key: 'tweak',
      icon: Edit3,
      label: 'Used in Edit',
      color: 'bg-green-100 text-green-700'
    });
  }

  if (refineUploadId) {
    badges.push({
      key: 'refine',
      icon: Sparkles,
      label: 'Used in Upscale',
      color: 'bg-purple-100 text-purple-700'
    });
  }

  if (badges.length === 0) {
    return null;
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <div className={`flex gap-1 ${className}`}>
      {badges.map(({ key, icon: Icon, label, color }) => (
        <div
          key={key}
          className={`inline-flex items-center gap-1 rounded-full font-medium ${color} ${sizeClasses}`}
          title={label}
        >
          <Icon size={iconSize} />
          {size === 'md' && <span>{key.charAt(0).toUpperCase()}</span>}
        </div>
      ))}
    </div>
  );
};

export default CrossModuleBadges;