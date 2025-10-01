import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import UsageNotification from "@/components/profile/UsageNotification";
import Sidebar from "@/components/layout/Sidebar";

const AccountSettingsPage: FC = () => {

  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-siggnal">Account Settings</h1>
          <p className="text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <UsageNotification />

      </div>
    </MainLayout>
  );
};

export default AccountSettingsPage;