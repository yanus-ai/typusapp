import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppSelector } from '@/hooks/useAppSelector';
import { Edit, LogOut } from 'lucide-react';

interface ProfileCardProps {
  onEdit?: () => void;
  onLogout?: () => void;
}

export const ProfileCard: FC<ProfileCardProps> = ({ 
  onEdit,
  onLogout 
}) => {
  const { user } = useAppSelector(state => state.auth);
  
  return (
    <Card className="bg-white shadow-sm bg-lightgray border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profilePicture} alt={user?.fullName} />
              <AvatarFallback className='text-white bg-gradient'>{getInitials(user?.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground">Name</p>
              <h2 className="text-xl font-medium">{user?.fullName || 'User'}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-gradient text-white"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-2 bg-red-500"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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

export default ProfileCard;