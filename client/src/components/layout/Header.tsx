import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { Crown, PanelsTopLeft, SquarePen, Sparkles, Images, HelpCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import CircularProgress from '../ui/circularProgress';
import TypusLogoBlack from '@/assets/images/typus_logo_black.png';
import { setIsModalOpen, setMode } from '@/features/gallery/gallerySlice';
import { getCurrentPageFromPath } from '@/utils/galleryImageSelection';
import VideoTooltip from '@/components/ui/video-tooltip';
import createVideo from '@/assets/tooltips/create.mp4';
import editVideo from '@/assets/tooltips/edit.mp4';
import upscaleVideo from '@/assets/tooltips/upscale.mp4';

const Header: FC<{ currentStep: number }> = ({ currentStep }) => {
  const { user, subscription, credits } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if subscription is usable (active or cancelled but not expired)
  const isSubscriptionUsable = (subscription: any) => {
    if (!subscription) return false;

    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : now;

    return (
      subscription.status === 'ACTIVE' ||
      (subscription.status === 'CANCELLED_AT_PERIOD_END' && now <= periodEnd)
    );
  };

  const hasUsableSubscription = isSubscriptionUsable(subscription);

  // Calculate credit usage properly - show credits if subscription is usable
  const availableCredits = hasUsableSubscription ? credits : 0;

  // For display purposes, show a meaningful percentage based on plan allocation
  const planCredits = subscription?.credits || 100; // Plan's credit allocation
  const percentageAvailable = Math.min(100, Math.max(0, Math.round((availableCredits / planCredits) * 100)));

  const isPaidPlan = hasUsableSubscription;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleOpenGallery = () => {
    // Determine the appropriate gallery mode based on current page
    const currentPage = getCurrentPageFromPath(location.pathname);
    let galleryMode: 'organize' | 'create' | 'edit' | 'upscale' = 'organize';

    switch (currentPage) {
      case 'create':
        galleryMode = 'create';
        break;
      case 'edit':
        galleryMode = 'edit';
        break;
      case 'upscale':
        galleryMode = 'upscale';
        break;
      default:
        galleryMode = 'organize';
        break;
    }

    // Set the gallery mode before opening the modal
    dispatch(setMode(galleryMode));
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };
  
  const handleResetOnboarding = () => {
    localStorage.removeItem("onboardingSeen");
    window.location.reload();
  };

  return (
    <header className="bg-background px-4 py-2 relative">
      <div className="flex justify-between items-center">
        {/* Left side - credits usage */}
        <div className="flex items-center gap-12 z-10">
          {/* Logo */}
          <div className='h-10 w-10'>
            <Link to="/" className="text-2xl font-bold">
              <img src={TypusLogoBlack} alt="Typus Logo" className="w-full h-full object-contain scale-150" />
            </Link>
          </div>

          <div className='flex items-center gap-4 z-10'>
            {!isPaidPlan && (
              <Button
                variant="ghost"
                className="bg-white text-xs shadow-sm hover:shadow-md"
                onClick={() => navigate('/subscription')}
              >
                <Crown className="size-4 mr-1" />
                Upgrade Now
              </Button>
            )}
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow-sm">
              <div className="flex items-center">
                <div className="h-5 w-5 rounded-full flex items-center justify-center">
                  <CircularProgress 
                    total={100}
                    current={availableCredits === 0 ? 100 : Math.max(2, percentageAvailable)} // Show 100% red when no credits, min 2% when has credits
                    size={20}
                    className="relative border-0 bg-white"
                    fillColor={availableCredits === 0 || percentageAvailable < 20 ? "#ef4444" : "#4ade80"}
                    background="#ffffff" // More visible background color
                  />
                </div>
                <div className="ml-2">
                  <div className="text-sm font-medium">
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
            <div className={`${currentStep === 0 ? 'z-[1000]' : 'z-[10]'} rounded-lg p-1 flex justify-center flex-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2`}>
              <div className='bg-white px-2 py-1 rounded-xl shadow-lg'>
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
                      onClick={handleCloseGallery}
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
                      onClick={handleCloseGallery}
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
                      onClick={handleCloseGallery}
                    />
                  </VideoTooltip>
                </ul>
              </div>
            </div>



            <div className="flex justify-end items-center gap-2">
              
            <button
                onClick={handleResetOnboarding}
                className=" rounded-full p-2 z-10"
                title="Restart Onboarding"
              >
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </button>
                <div className={`${currentStep === 2 ? 'z-[1000]' : 'z-[10]'} flex items-center px-2 rounded-xl gap-1 h-full py-1`}>
                  <button
                    onClick={handleOpenGallery}
                    className={`!px-6 flex items-center flex-shrink-0 py-1 rounded-lg bg-white shadow-sm text-sm h-full transition-colors cursor-pointer hover:shadow-md font-medium gap-2`}
                  >
                    <Images className="h-4 w-4" />
                    Gallery
                  </button>
                </div>
              <div 
                className={`${currentStep === 1 ? 'z-[1000] relative bg-white rounded-full overflow-hidden' : 'z-[10]'}`}>
              <Link
                to="/overview"
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
  onClick?: () => void;
}

const NavItem: FC<NavItemProps> = ({ to, icon, label, active, onClick }) => {
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        className={`px-6 flex items-center flex-shrink-0 py-1 rounded-full h-8 gap-2 text-sm font-medium transition-colors
          ${active
            ? 'bg-red-50 text-red-500 border border-red-200'
            : 'hover:bg-gray-100 border border-transparent'
          }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Header;