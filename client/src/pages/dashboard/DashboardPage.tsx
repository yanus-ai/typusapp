import { useAppSelector } from '../../hooks/useAppSelector';
import LogoutButton from '@/components/auth/LogoutButton';

const DashboardPage = () => {
  const { user } = useAppSelector(state => state.auth);
  
  return (
    <div className="p-8 max-w-4xl mx-auto font-funnel">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <LogoutButton />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user?.fullName}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-4">
            <p className="text-sm text-gray-500">Email</p>
            <p>{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;