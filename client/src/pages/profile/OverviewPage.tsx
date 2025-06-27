import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProfileCard from "@/components/profile/ProfileCard";
import UsageNotification from "@/components/profile/UsageNotification";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";

const OverviewPage: FC = () => {
  const { logoutUser } = useAuth();
  
  const handleEdit = () => {
    // Navigate to edit profile page or open modal
    console.log("Edit profile clicked");
  };
  
  const handleLogout = () => {
    logoutUser();
  };
  
  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="space-y-6 p-6 font-outfit flex-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            This is overview page of Prätt
          </p>
        </div>
        
        <ProfileCard 
          onEdit={handleEdit} 
          onLogout={handleLogout} 
        />
        
        <UsageNotification />
        
        {/* <SubscriptionCard /> */}
      </div>
    </MainLayout>
  );
};

export default OverviewPage;