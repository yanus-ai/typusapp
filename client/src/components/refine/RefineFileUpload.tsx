import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Image, FileImage } from 'lucide-react';

interface RefineFileUploadProps {
  onUploadImage: (file: File) => void;
  loading?: boolean;
}

const RefineFileUpload: React.FC<RefineFileUploadProps> = ({ onUploadImage, loading = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onUploadImage) {
      onUploadImage(files[0]);
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onUploadImage) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onUploadImage(file);
      }
    }
  };

  return (
    <div className="flex items-center justify-center p-8 mx-auto">
      <Card className="w-full max-w-md shadow-md">
        <CardContent className="p-8">
          <div 
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }
              ${loading ? 'pointer-events-none opacity-50' : ''}
            `}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              {/* Icon */}
              <div className="flex justify-center">
                {loading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                ) : (
                  <div className="p-4 bg-gray-100 rounded-full">
                    <Upload className="h-8 w-8 text-gray-600" />
                  </div>
                )}
              </div>
              
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {loading ? 'Uploading...' : 'Upload an image to refine'}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Drag and drop your image here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Max: 5MB, 2000px width
                </p>
              </div>
              
              {/* Supported formats */}
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <FileImage className="h-3 w-3" />
                  <span>JPG</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileImage className="h-3 w-3" />
                  <span>PNG</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileImage className="h-3 w-3" />
                  <span>WEBP</span>
                </div>
              </div>
              
              {/* Upload button */}
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Image className="h-4 w-4 mr-2" />
                      Choose Image
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <input 
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefineFileUpload;