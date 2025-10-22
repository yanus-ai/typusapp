import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/components/onboarding/hooks/useOnboarding';
import { Monitor, Briefcase, Clock, DollarSign, MapPin, Phone, Building } from 'lucide-react';

const OnboardingDataCard: React.FC = () => {
  const { data: onboardingData, isCompleted, loading } = useOnboarding();

  // Don't show if onboarding is not completed or still loading
  if (!isCompleted || loading || !onboardingData) {
    return null;
  }

  const getStatusColor = () => {
      return 'bg-gray-100 text-gray-800';
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
              <Briefcase className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor()}>
                  {onboardingData.status}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{onboardingData.streetAndNumber}</p>
                  <p className="text-gray-600">{onboardingData.city}, {onboardingData.state} {onboardingData.postcode}</p>
                  <p className="text-gray-600">{onboardingData.country}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="font-medium text-gray-900">{onboardingData.phoneNumber}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Company Name</p>
                <p className="font-medium text-gray-900">{onboardingData.companyName}</p>
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
