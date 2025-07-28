import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Crown, PanelsTopLeft, SquarePen, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CircularProgress from '../ui/circularProgress';

const Header: FC = () => {
  const { user, subscription, credits } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  
  // Calculate percentage of credits used
  const totalCredits = subscription?.credits || 100;
  const percentageUsed = Math.min(100, Math.round(((totalCredits - credits) / totalCredits) * 100));
  
  const isPaidPlan = subscription?.planType !== 'FREE';

  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <header className="bg-background px-4 py-2 relative z-10">
      <div className="flex justify-between items-center">
        {/* Left side - credits usage */}
        <div className="flex items-center gap-12">
          {/* Logo */}
          <div>
            <Link to="/" className="text-2xl font-bold">Präi</Link>
          </div>

          <div className='flex items-center gap-4'>
            {!isPaidPlan && (
              <Button 
                variant="default" 
                className="bg-black text-white text-xs"
                onClick={() => navigate('/subscription-plan')}
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
                    current={100 - percentageUsed}
                    size={20}
                    className="relative border-0 bg-lightgray"
                    fillColor={100 - percentageUsed < 20 ? "#ef4444" : "#4ade80"}
                    background="#f7f7f7"
                  />
                </div>
                <span className="ml-2 text-xs font-medium">{100 - percentageUsed}% Credits Available</span>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center flex-1'>
          {/* Right side - actions */}
          <div className="grid grid-cols-3 gap-2 flex-1">
            <div className="col-span-2 rounded-lg p-1 flex justify-center">
              <div className='bg-lightgray px-2 py-1 rounded-xl shadow-lg'>
                <ul className="flex items-center px-2 gap-1">
                  <NavItem 
                    to="/create" 
                    icon={<PanelsTopLeft className="h-4 w-4" />} 
                    label="Create" 
                    active={isActive("/create")} 
                  />
                  <NavItem 
                    to="/tweak" 
                    icon={<SquarePen className="h-4 w-4" />} 
                    label="Tweak"
                    active={isActive("/tweak")} 
                  />
                  <NavItem 
                    to="/refine" 
                    icon={<Sparkles className="h-4 w-4" />} 
                    label="Refine"
                    active={isActive("/refine")} 
                  />
                </ul>
              </div>
              {/* <div className='flex items-center bg-darkgray px-2 py-1 rounded-xl px-2 gap-1'>
                <Button variant="ghost" className="!px-6 flex items-center flex-shrink-0 py-1 rounded-full" size="sm">
                  <PanelsTopLeft className="h-3 w-3" />
                  Create
                </Button>
                <Button variant="ghost" className="!px-6 flex items-center flex-shrink-0 py-1 rounded-full" size="sm">
                  <PanelsTopLeft className="h-3 w-3" />
                  Tweak
                </Button>
                <Button variant="ghost" className="!px-6 flex items-center flex-shrink-0 py-1 rounded-full" size="sm">
                  <PanelsTopLeft className="h-3 w-3" />
                  Refine
                </Button>
              </div> */}
            </div>

            <div className="flex flex-1 justify-end">
              <Avatar className="h-10 w-10 shadow">
                <AvatarImage src={user?.profilePicture} alt={user?.fullName} />
                <AvatarFallback className='text-white bg-gradient'>{getInitials(user?.fullName)}</AvatarFallback>
              </Avatar>
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