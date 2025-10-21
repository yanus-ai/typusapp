import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/hooks/useOnboarding';
import { User, Mail, Monitor, Briefcase, Clock, DollarSign } from 'lucide-react';

const OnboardingDataCard: React.FC = () => {
  const { data: onboardingData, isCompleted, loading } = useOnboarding();

  // Don't show if onboarding is not completed or still loading
  if (!isCompleted || loading || !onboardingData) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Architectural Student':
        return 'bg-blue-100 text-blue-800';
      case 'Architectural Employee':
        return 'bg-green-100 text-green-800';
      case 'Self employed Architect':
        return 'bg-purple-100 text-purple-800';
      case '3D Artist':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Personal Details</h4>
            
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">{onboardingData.fullName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{onboardingData.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(onboardingData.status)}>
                  {onboardingData.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Professional Details</h4>
            
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Software</p>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{onboardingData.software}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Time on Renderings</p>
                <p className="font-medium text-gray-900">{onboardingData.timeOnRenderings}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Outsourcing Budget</p>
                <p className="font-medium text-gray-900">{onboardingData.moneySpentForOneImage}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingDataCard;
