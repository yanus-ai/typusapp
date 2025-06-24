import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Crown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CircularProgress from '../ui/circularProgress';

const Header: FC = () => {
  const { user, subscription, credits } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  
  // Calculate percentage of credits used
  const totalCredits = subscription?.credits || 100;
  const percentageUsed = Math.min(100, Math.round(((totalCredits - credits) / totalCredits) * 100));
  
  const isPaidPlan = subscription?.planType !== 'FREE';
  
  return (
    <header className="bg-background p-4">
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
                className="bg-gradient text-white"
                onClick={() => navigate('/subscription-plan')}
              >
                <Crown className="h-3 w-3 mr-1" />
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
                <span className="ml-2 text-sm font-medium">{100 - percentageUsed}% Credits Available</span>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center flex-1'>
          {/* Right side - actions */}
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-muted rounded-lg p-1 flex flex-1 justify-center">
              <Button variant="ghost" className="px-4 rounded-md" size="sm">Create</Button>
              <Button variant="ghost" className="px-4 rounded-md" size="sm">Tweak</Button>
              <Button variant="ghost" className="px-4 rounded-md" size="sm">Refine</Button>
            </div>

            <div className="flex flex-1 justify-end">
              <Avatar className="h-12 w-12 shadow">
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

export default Header;