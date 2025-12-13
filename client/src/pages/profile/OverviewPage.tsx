import { FC } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProfileCard from "@/components/profile/ProfileCard";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import { CreditUsageCard } from '@/components/profile/CreditUsageCard';
import OnboardingAlert from '@/components/profile/OnboardingAlert';
import OnboardingDataCard from '@/components/profile/OnboardingDataCard';
import { useTranslation } from '@/hooks/useTranslation';

const OverviewPage: FC = () => {
  const { logoutUser } = useAuth();
  const { t } = useTranslation();
  
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
          <h1 className="text-3xl font-semibold tracking-tight font-siggnal">{t('profile.overview.title')}</h1>
          <p className="text-sm text-gray-600">
            {t('profile.overview.description')}
          </p>
        </div>
        
        {/* Onboarding Alert */}
        <OnboardingAlert />
        
        <ProfileCard 
          onEdit={handleEdit} 
          onLogout={handleLogout} 
        />

        {/* Onboarding Data Card */}
        <OnboardingDataCard />
        
      {/* Credit Usage Overview */}
        <div className="mb-8 mx-auto w-full">
          <CreditUsageCard />
        </div>

        
        {/* <SubscriptionCard /> */}
      </div>
    </MainLayout>
  );
};

export default OverviewPage;