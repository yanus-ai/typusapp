import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ImageTaggingStatusProps {
  taggingStatus?: 'processing' | 'completed' | 'failed';
  tags?: Array<{ tag: string; confidence: number }>;
  className?: string;
}

const ImageTaggingStatus: React.FC<ImageTaggingStatusProps> = ({
  taggingStatus,
  tags,
  className = ''
}) => {
  // Don't show anything if no tagging status
  if (!taggingStatus) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>

      {taggingStatus === 'completed' && tags && tags.length > 0 && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600">
            {tags.length} tag{tags.length !== 1 ? 's' : ''} generated
          </span>
        </>
      )}

      {taggingStatus === 'failed' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-600">Tag generation failed</span>
        </>
      )}
    </div>
  );
};

export default ImageTaggingStatus;