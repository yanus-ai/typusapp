import { FC, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useCreditData } from "@/hooks/useCreditData";
import {
  Crown,
  PanelsTopLeft,
  SquarePen,
  Sparkles,
  Images,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import CircularProgress from "../ui/circularProgress";
import TypusLogoBlack from "@/assets/images/typus_logo_black.png";
import { setIsModalOpen, setMode } from "@/features/gallery/gallerySlice";
import { getCurrentPageFromPath } from "@/utils/galleryImageSelection";
import VideoTooltip from "@/components/ui/video-tooltip";
import createVideo from "@/assets/tooltips/create.mp4";
import editVideo from "@/assets/tooltips/edit.mp4";
import upscaleVideo from "@/assets/tooltips/upscale.mp4";
import LightTooltip from "../ui/light-tooltip";
import { cn } from "@/lib/utils";

const Header: FC<{ currentStep: number }> = ({ currentStep }) => {
  const { user, subscription } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { creditData } = useCreditData();

  // Check if subscription is usable (active or cancelled but not expired)
  const isSubscriptionUsable = (subscription: { status: string; currentPeriodEnd?: string | Date } | null) => {
    if (!subscription) return false;

    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : now;

    return (
      subscription.status === "ACTIVE" ||
      (subscription.status === "CANCELLED_AT_PERIOD_END" && now <= periodEnd)
    );
  };

  const hasUsableSubscription = isSubscriptionUsable(subscription);

  // Use real data if available, otherwise fallback to calculated values
  const subscriptionPercentage = creditData?.subscription.usagePercentage || 0;
  const topUpPercentage = creditData?.topUp.usagePercentage || 0;
  const topUpUsed = creditData?.topUp.totalUsed || 0;
  const topUpTotalPurchased = creditData?.topUp.totalPurchased || 0;
  const usedFromPlan = creditData?.subscription.used || 0;
  const planCredits = creditData?.subscription.planAllocation || 0;
  const topUpCredits = creditData?.topUp.remaining || 0;
  const plans = useMemo(() => [
    planCredits > 0 ? `${usedFromPlan.toLocaleString()}/${planCredits.toLocaleString()} plan` : null,
   topUpTotalPurchased > 0 ? `${topUpUsed.toLocaleString()}/${topUpTotalPurchased.toLocaleString()} top-up` : null
  ].filter(e => e), [planCredits, topUpTotalPurchased, topUpUsed, usedFromPlan])

  const isPaidPlan = hasUsableSubscription;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleOpenGallery = () => {
    // Determine the appropriate gallery mode based on current page
    const currentPage = getCurrentPageFromPath(location.pathname);
    let galleryMode: "organize" | "create" | "edit" | "upscale" = "organize";

    switch (currentPage) {
      case "create":
        galleryMode = "create";
        break;
      case "edit":
        galleryMode = "edit";
        break;
      case "upscale":
        galleryMode = "upscale";
        break;
      default:
        galleryMode = "organize";
        break;
    }

    // Set the gallery mode before opening the modal
    dispatch(setMode(galleryMode));
    dispatch(setIsModalOpen(true));
  };

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  useEffect(() => {
    if (currentStep === 2) {
      dispatch(setMode("explore"));
      dispatch(setIsModalOpen(true));
    }
  }, [currentStep, dispatch]);

  const handleResetOnboarding = () => {
    navigate("/create");
    localStorage.removeItem("onboardingSeen");
    window.location.reload();
  };

  return (
    <header className="bg-background px-4 py-2 relative">
      <div className="flex justify-between items-center">
        {/* Left side - credits usage */}
        <div className="flex items-center gap-12 z-10">
          {/* Logo */}
          <div className="h-10 w-10">
            <Link to="/" className="text-2xl font-bold">
              <img
                src={TypusLogoBlack}
                alt="Typus Logo"
                className="w-full h-full object-contain scale-150"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4 z-10">
            {!isPaidPlan && (
              <Button
                variant="ghost"
                className="bg-white text-xs shadow-sm hover:shadow-md"
                onClick={() => navigate("/subscription")}
              >
                <Crown className="size-4 mr-1" />
                Upgrade Now
              </Button>
            )}

            <LightTooltip text="View Credits" direction="bottom">
              <div
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
                onClick={() => navigate('/overview')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/overview');
                  }
                }}
              >
                <div className="flex items-center">
                  {/* Nested circles - outer for subscription, inner for top-up */}
                  <div className="relative size-[25px]">
                    {/* Outer circle - Subscription Credits Usage */}
                    <CircularProgress
                      total={100}
                      current={subscriptionPercentage}
                      size={25}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-0"
                      strokeWidth={3}
                      fillColor={
                        subscriptionPercentage > 80
                          ? "#ef4444"
                          : subscriptionPercentage > 50
                          ? "#f59e0b"
                          : "#4ade80"
                      }
                    />
                    {/* Inner circle - Top-up Credits Usage */}
                    <CircularProgress
                      total={100}
                      current={topUpPercentage}
                      size={15}
                      className={cn("absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-0", {
                        'hidden': topUpCredits < 1
                      })}
                      strokeWidth={3}
                      fillColor={
                        topUpCredits > 0
                          ? "#4ade80"
                          : "#e5e7eb"
                      }
                    />
                  </div>
                  <div className={cn("ml-3", { 'hidden': plans.length < 1 })}>
                    <div className="text-sm text-gray-500">
                      {plans.join(' • ')} 
                    </div>
                  </div>
                </div>
              </div>
            </LightTooltip>
          </div>
        </div>

        <div className="flex items-center">
          {/* Right side - actions */}
          <div className="flex">
            <div
              className={`${
                currentStep === 0 ? "z-[1001]" : "z-[10]"
              } rounded-lg p-1 flex justify-center flex-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2`}
            >
              <div className="bg-white px-2 py-1 rounded-xl shadow-lg">
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
              <LightTooltip text="Academy" direction="bottom">
                <button
                  onClick={() => navigate("/academy")}
                  className=" rounded-full p-2 z-10"
                >
                  <GraduationCap className="h-5 w-5 text-gray-600" />
                </button>
              </LightTooltip>
              <LightTooltip text="App tour" direction="bottom">
                <button
                  onClick={handleResetOnboarding}
                  className=" rounded-full p-2 z-10"
                >
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                </button>
              </LightTooltip>
              <div
                className={`${
                  currentStep === 2 ? "z-[1001]" : "z-[10]"
                } flex items-center px-2 rounded-xl gap-1 h-full py-1`}
              >
                <button
                  onClick={handleOpenGallery}
                  className={`!px-6 flex items-center flex-shrink-0 py-1 rounded-lg bg-white shadow-sm text-sm h-full transition-colors cursor-pointer hover:shadow-md font-medium gap-2`}
                >
                  <Images className="h-4 w-4" />
                  Gallery
                </button>
              </div>
              <div
                className={`${
                  currentStep === 1
                    ? "z-[1001] relative bg-white rounded-full overflow-hidden"
                    : "z-[10]"
                }`}
              >
                <LightTooltip text="Account" direction="bottom">
                  <Link to="/overview">
                    <Avatar className="h-10 w-10 shadow">
                      <AvatarImage
                        src={user?.profilePicture}
                        alt={user?.fullName}
                      />
                      <AvatarFallback className="text-white bg-gradient">
                        {getInitials(user?.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* <span className="ml-2 text-sm font-medium">{user?.fullName || 'User'}</span> */}
                  </Link>
                </LightTooltip>
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
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
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
          ${
            active
              ? "bg-red-50 text-red-500 border border-red-200"
              : "hover:bg-gray-100 border border-transparent"
          }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Header;
