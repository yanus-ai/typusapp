import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import GalleryPage from '@/pages/gallery/GalleryPage';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);

  // Close modal when navigating to different pages (but not during variant generation within same page)
  useEffect(() => {
    if (isOpen && location.pathname !== previousPathnameRef.current) {
      onClose();
    }
    previousPathnameRef.current = location.pathname;
  }, [location.pathname, isOpen, onClose]); // This will close when pathname changes (e.g., /create -> /edit)

  // Close modal on Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => onClose()}
      />
      
      {/* Modal Content - Full Page */}
      <div className="relative w-full h-full bg-white">
        <GalleryPage onModalClose={onClose} />
      </div>
    </div>
  );
};

export default GalleryModal;