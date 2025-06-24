import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logout } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

const LogoutButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    dispatch(logout());
    toast.success('You have been logged out successfully');
    navigate('/login');
  };
  
  return (
    <Button variant="outline" onClick={handleLogout}>
      Sign Out
    </Button>
  );
};

export default LogoutButton;