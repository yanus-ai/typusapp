import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { Crown, PanelsTopLeft, SquarePen, Sparkles, Images } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import CircularProgress from '../ui/circularProgress';
import TypusLogo from '@/assets/images/typus-logo.png';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';
import VideoTooltip from '@/components/ui/video-tooltip';
import createVideo from '@/assets/tooltips/create.mp4';
import editVideo from '@/assets/tooltips/edit.mp4';
import upscaleVideo from '@/assets/tooltips/upscale.mp4';

const Header: FC = () => {
  const { user, subscription, credits } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Calculate credit usage properly - use actual available credits
  const availableCredits = credits; // Credits user has remaining (from credit transactions)
  
  // For display purposes, show a meaningful percentage based on plan allocation
  const planCredits = subscription?.credits || 100; // Plan's credit allocation
  const percentageAvailable = Math.min(100, Math.max(0, Math.round((availableCredits / planCredits) * 100)));
  
  const isPaidPlan = Boolean(subscription?.planType);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Check if current page should show gallery button
  const shouldShowGalleryButton = () => {
    return isActive('/create') || isActive('/edit') || isActive('/upscale');
  };

  const handleOpenGallery = () => {
    dispatch(setIsModalOpen(true));
  };
  
  return (
    <header className="bg-background px-4 py-2 relative z-10">
      <div className="flex justify-between items-center">
        {/* Left side - credits usage */}
        <div className="flex items-center gap-12">
          {/* Logo */}
          <div className='h-8 w-8'>
            <Link to="/" className="text-2xl font-bold">
              <img src={TypusLogo} alt="Typus Logo" className="w-full h-full object-contain" />
            </Link>
          </div>

          <div className='flex items-center gap-4'>
            {!isPaidPlan && (
              <Button 
                variant="default" 
                className="bg-black text-white text-xs"
                onClick={() => navigate('/subscription')}
              >
                <Crown className="size-4 mr-1" />
                Upgrade Now
              </Button>
            )}
            
            <div className="flex items-center gap-2 bg-lightgray px-4 py-2 rounded-md">
              <div className="flex items-center">
                <div className="h-5 w-5 rounded-full flex items-center justify-center">
                  <CircularProgress 
                    total={100}
                    current={percentageAvailable}
                    size={20}
                    className="relative border-0 bg-lightgray"
                    fillColor={percentageAvailable < 20 ? "#ef4444" : "#4ade80"}
                    background="#f7f7f7"
                  />
                </div>
                <div className="ml-2">
                  <div className="text-xs font-medium">
                    {availableCredits.toLocaleString()} credits available
                  </div>
                  {/* <div className="text-xs text-gray-500">
                    Plan: {planCredits.toLocaleString()} credits
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center'>
          {/* Right side - actions */}
          <div className="flex">
            <div className="rounded-lg p-1 flex justify-center flex-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className='bg-lightgray px-2 py-1 rounded-xl shadow-lg'>
                <ul className="flex items-center px-2 gap-1">
                  <VideoTooltip 
                    videoSrc={createVideo}
                    title="Create Images"
                    description="Generate stunning AI images from text prompts"
                    direction="bottom"
                  >
                    <NavItem 
                      to="/create" 
                      icon={<PanelsTopLeft className="h-4 w-4" />} 
                      label="Create" 
                      active={isActive("/create")} 
                    />
                  </VideoTooltip>
                  <VideoTooltip 
                    videoSrc={editVideo}
                    title="Edit Images"
                    description="Modify and enhance your existing images with AI"
                    direction="bottom"
                  >
                    <NavItem 
                      to="/edit" 
                      icon={<SquarePen className="h-4 w-4" />} 
                      label="Edit"
                      active={isActive("/edit")} 
                    />
                  </VideoTooltip>
                  <VideoTooltip 
                    videoSrc={upscaleVideo}
                    title="Upscale Images"
                    description="Enhance image resolution and quality with AI upscaling"
                    direction="bottom"
                  >
                    <NavItem 
                      to="/upscale" 
                      icon={<Sparkles className="h-4 w-4" />} 
                      label="Upscale"
                      active={isActive("/upscale")} 
                    />
                  </VideoTooltip>
                </ul>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2">
              {shouldShowGalleryButton() && (
                <div className='flex items-center px-2 rounded-xl gap-1 h-full py-1'>
                  <button
                    onClick={handleOpenGallery}
                    className={`!px-6 flex items-center flex-shrink-0 py-1 rounded-lg bg-white border shadow-sm text-sm h-full hover:bg-gray-50 transition-colors`}
                  >
                    <Images className="h-4 w-4 mr-2" />
                    Gallery
                  </button>
                </div>
              )}
              <Link
                to="/overview"
                className={``}
              >
                <Avatar className="h-10 w-10 shadow">
                  <AvatarImage src={user?.profilePicture} alt={user?.fullName} />
                  <AvatarFallback className='text-white bg-gradient'>{getInitials(user?.fullName)}</AvatarFallback>
                </Avatar>
                {/* <span className="ml-2 text-sm font-medium">{user?.fullName || 'User'}</span> */}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Helper function to get initials
function getInitials(name?: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem: FC<NavItemProps> = ({ to, icon, label, active }) => {
  return (
    <li>
      <Link
        to={to}
        className={`px-6 flex items-center flex-shrink-0 py-1 rounded-full h-8 gap-1.5 text-xs
          ${active 
            ? 'bg-white' 
            : 'hover:bg-white'
          }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Header;