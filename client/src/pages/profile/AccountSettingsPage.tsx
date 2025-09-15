import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProfileCard from "@/components/profile/ProfileCard";
import UsageNotification from "@/components/profile/UsageNotification";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import { CreditUsageCard } from '@/components/profile/CreditUsageCard';

const AccountSettingsPage: FC = () => {
  const { logoutUser } = useAuth();

  const handleEdit = () => {
    // Navigate to edit profile page or open modal
  };

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-siggnal">Account Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <UsageNotification />

      </div>
    </MainLayout>
  );
};

export default AccountSettingsPage;