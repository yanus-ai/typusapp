import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setMode } from '@/features/gallery/gallerySlice';
import { Search, FolderOpen, PlusSquare, Edit3, Sparkles } from 'lucide-react';

interface GallerySidebarProps {
  isModal?: boolean;
}

const GallerySidebar: React.FC<GallerySidebarProps> = ({ isModal = false }) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const galleryMode = useAppSelector(state => state.gallery.mode);
  
  // Check if we're on the gallery page (standalone or modal)
  const isOnGalleryPage = isModal || location.pathname === '/gallery';
  
  const isActive = (path: string) => {
    if (isOnGalleryPage) {
      // On gallery page (modal or standalone), use internal state
      switch (path) {
        case '/gallery': return galleryMode === 'organize';
        case '/create': return galleryMode === 'create';
        case '/edit': return galleryMode === 'edit';
        case '/upscale': return galleryMode === 'upscale';
        default: return false;
      }
    }
    return location.pathname === path;
  };

  const handleModeChange = (mode: 'organize' | 'create' | 'edit' | 'upscale') => {
    if (isOnGalleryPage) {
      dispatch(setMode(mode));
    }
  };
  
  return (
    <div className="w-64 bg-site-white flex flex-col rounded-tr-md">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Public Section */}
          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-3">
              Public
            </h3>
            <ul className="space-y-1">
              <NavItem 
                to="/explore" 
                icon={<Search className="h-5 w-5" />} 
                label="Explore" 
                active={isActive("/explore")} 
                isGalleryPage={isOnGalleryPage}
                onClick={() => {}} // No-op for explore on gallery page
              />
            </ul>
          </div>
          
          {/* My Work Section */}
          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-3">
              My Work
            </h3>
            <ul className="space-y-1">
              <NavItem 
                to="/gallery" 
                icon={<FolderOpen className="h-5 w-5" />} 
                label="Organize" 
                active={isActive("/gallery")} 
                isGalleryPage={isOnGalleryPage}
                onClick={() => handleModeChange('organize')}
              />
              <NavItem 
                to="/create" 
                icon={<PlusSquare className="h-5 w-5" />} 
                label="Create"
                active={isActive("/create")} 
                isGalleryPage={isOnGalleryPage}
                onClick={() => handleModeChange('create')}
              />
              <NavItem 
                to="/edit" 
                icon={<Edit3 className="h-5 w-5" />} 
                label="Edit"
                active={isActive("/edit")} 
                isGalleryPage={isOnGalleryPage}
                onClick={() => handleModeChange('edit')}
              />
              <NavItem 
                to="/upscale" 
                icon={<Sparkles className="h-5 w-5" />} 
                label="Upscale"
                active={isActive("/upscale")} 
                isGalleryPage={isOnGalleryPage}
                onClick={() => handleModeChange('upscale')}
              />
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isGalleryPage?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, active, isGalleryPage = false, onClick }) => {
  const commonClasses = `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full transition-colors cursor-pointer ${
    active 
      ? 'bg-red-50 text-red-500 border border-red-200' 
      : 'hover:bg-gray-100 border border-transparent'
  }`;

  // On gallery page (modal or standalone), use button to prevent navigation and enable mode switching
  if (isGalleryPage) {
    return (
      <li>
        <button
          onClick={onClick}
          className={commonClasses}
        >
          {icon}
          <span>{label}</span>
        </button>
      </li>
    );
  }

  // For other pages, use Link for normal navigation
  return (
    <li>
      <Link
        to={to}
        className={commonClasses}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default GallerySidebar;