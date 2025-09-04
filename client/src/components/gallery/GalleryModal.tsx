import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useAppSelector';
import GalleryPage from '@/pages/gallery/GalleryPage';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isVariantGenerating = useAppSelector(state => state.gallery.isVariantGenerating);

  // Close modal when route changes - but prevent closing if variant is generating
  useEffect(() => {
    // Only close the modal on route changes if no variant is generating
    if (isOpen && !isVariantGenerating) {
      onClose();
    }
  }, [location.pathname]); // Only depend on pathname, not onClose or isOpen

  // Close modal on Escape key - but prevent closing if variant is generating
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isVariantGenerating) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isVariantGenerating]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => !isVariantGenerating && onClose()}
      />
      
      {/* Modal Content - Full Page */}
      <div className="relative w-full h-full bg-white">
        <GalleryPage onModalClose={onClose} />
      </div>
    </div>
  );
};

export default GalleryModal;