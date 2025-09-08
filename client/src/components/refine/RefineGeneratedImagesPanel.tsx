import React from 'react';
import { Clock, Download, Sparkles, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RefineOperation {
  id: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  batchId: number;
  processedImageUrl?: string;
  sourceImageId: number;
  sourceImageUrl: string;
  settings: any;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface RefineGeneratedImagesPanelProps {
  operations: RefineOperation[];
  loadingOperations: boolean;
  selectedImageId: number | null;
  onImageSelect?: (imageUrl: string, operationId: number) => void;
}

const RefineGeneratedImagesPanel: React.FC<RefineGeneratedImagesPanelProps> = ({
  operations,
  loadingOperations,
  selectedImageId,
  onImageSelect
}) => {
  // Filter and sort operations - show completed first, then processing, then failed
  const sortedOperations = [...operations].sort((a, b) => {
    // Sort by status priority: COMPLETED > PROCESSING > FAILED/CANCELLED
    const statusPriority = (status: string) => {
      switch (status) {
        case 'COMPLETED': return 3;
        case 'PROCESSING': return 2;
        case 'FAILED':
        case 'CANCELLED': return 1;
        default: return 0;
      }
    };
    
    if (statusPriority(a.status) !== statusPriority(b.status)) {
      return statusPriority(b.status) - statusPriority(a.status);
    }
    
    // Within same status, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PROCESSING':
        return <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'PROCESSING':
        return 'Processing...';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const downloadImage = async (imageUrl: string, operationId: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `typus-airefined-${operationId}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Fallback to direct link
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `typus-airefined-${operationId}-${Date.now()}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  if (loadingOperations) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generated Images
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generated Images
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No refined images yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Generate your first refined image to see results here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Generated Images ({operations.length})
      </h3>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {sortedOperations.map((operation) => (
          <div
            key={operation.id}
            className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              {/* Image Preview */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  {operation.status === 'COMPLETED' && operation.processedImageUrl ? (
                    <img
                      src={operation.processedImageUrl}
                      alt={`Refined ${operation.id}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => onImageSelect?.(operation.processedImageUrl!, operation.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getStatusIcon(operation.status)}
                    </div>
                  )}
                </div>
                
                {/* Status badge */}
                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                  operation.status === 'COMPLETED' ? 'bg-green-100' :
                  operation.status === 'PROCESSING' ? 'bg-blue-100' :
                  operation.status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  {getStatusIcon(operation.status)}
                </div>
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Refine #{operation.id}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getStatusText(operation.status)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(operation.createdAt)}
                    </p>
                  </div>
                  
                  {/* Action buttons */}
                  {operation.status === 'COMPLETED' && operation.processedImageUrl && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => downloadImage(operation.processedImageUrl!, operation.id)}
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Settings summary */}
                {operation.settings && (
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    <div>Scale: {operation.settings.scaleFactor || 1}x</div>
                    <div className="flex space-x-3">
                      <span>AI: {operation.settings.aiStrength || 12}</span>
                      <span>Clarity: {operation.settings.clarity || 12}</span>
                      <span>Sharpness: {operation.settings.sharpness || 12}</span>
                    </div>
                  </div>
                )}
                
                {/* Error message */}
                {operation.status === 'FAILED' && operation.errorMessage && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {operation.errorMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RefineGeneratedImagesPanel;