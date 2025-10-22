import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/components/onboarding/hooks/useOnboarding';
import { Monitor, Briefcase, Clock, DollarSign, MapPin, Phone, Building, Edit3, Save, X } from 'lucide-react';
import { OnboardingData } from '@/components/onboarding/types';
import { questions } from '../onboarding/constants';

const OnboardingDataCard: React.FC = () => {
  const { data: onboardingData, isCompleted, loading, updateOnboarding } = useOnboarding();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<OnboardingData>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Don't show if onboarding is not completed or still loading
  if (!isCompleted || loading || !onboardingData) {
    return null;
  }

  const getStatusColor = () => {
      return 'bg-gray-100 text-gray-800';
  };

  const handleEdit = () => {
    setEditedData({ ...onboardingData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOnboarding(editedData as OnboardingData);
      setIsEditing(false);
      setEditedData({});
    } catch (error) {
      console.error('Error updating onboarding data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof OnboardingData, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="bg-lightgray border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Completed
            </Badge>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2 border-0 shadow-none"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2 border-0 shadow-none"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-white"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Personal Details</h4>
            <div className="flex items-center space-x-3">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Status</p>
                {isEditing ? (
                  <select
                    value={editedData.status || ''}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {questions.find(question => question.id === 'status')?.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <Badge className={getStatusColor()}>
                    {onboardingData.status}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Address</p>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editedData.streetAndNumber || ''}
                      onChange={(e) => handleFieldChange('streetAndNumber', e.target.value)}
                      placeholder="Street & Number"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editedData.city || ''}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        placeholder="City"
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={editedData.state || ''}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        placeholder="State"
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editedData.postcode || ''}
                        onChange={(e) => handleFieldChange('postcode', e.target.value)}
                        placeholder="Postcode"
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={editedData.country || ''}
                        onChange={(e) => handleFieldChange('country', e.target.value)}
                        placeholder="Country"
                        className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{onboardingData.streetAndNumber}</p>
                    <p className="text-gray-600">{onboardingData.city}, {onboardingData.state} {onboardingData.postcode}</p>
                    <p className="text-gray-600">{onboardingData.country}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Phone Number</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedData.phoneNumber || ''}
                    onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{onboardingData.phoneNumber}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Company Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.companyName || ''}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{onboardingData.companyName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Professional Details</h4>
            
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Software</p>
                {isEditing ? (
                  <select
                    value={editedData.software || ''}
                    onChange={(e) => handleFieldChange('software', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {questions.find(question => question.id === 'software')?.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-gray-900">{onboardingData.software}</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Time on Renderings</p>
                {isEditing ? (
                  <select
                    value={editedData.timeOnRenderings || ''}
                    onChange={(e) => handleFieldChange('timeOnRenderings', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {questions.find(question => question.id === 'timeOnRenderings')?.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-900">{onboardingData.timeOnRenderings}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Outsourcing Budget</p>
                {isEditing ? (
                  <select
                    value={editedData.moneySpentForOneImage || ''}
                    onChange={(e) => handleFieldChange('moneySpentForOneImage', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {questions.find(question => question.id === 'moneySpentForOneImage')?.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-900">{onboardingData.moneySpentForOneImage}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingDataCard;
