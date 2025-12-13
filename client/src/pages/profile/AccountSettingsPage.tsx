import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import UsageNotification from "@/components/profile/UsageNotification";
import Sidebar from "@/components/layout/Sidebar";
import { useTranslation } from '@/hooks/useTranslation';

const AccountSettingsPage: FC = () => {
  const { t } = useTranslation();

  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="w-full space-y-6 p-6 flex-1 overflow-auto">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-siggnal">{t('profile.accountSettings.title')}</h1>
          <p className="text-sm text-gray-600">
            {t('profile.accountSettings.description')}
          </p>
        </div>

        <UsageNotification />

      </div>
    </MainLayout>
  );
};

export default AccountSettingsPage;