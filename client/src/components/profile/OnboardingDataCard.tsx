import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/components/onboarding/hooks/useOnboarding';
import { Monitor, Briefcase, DollarSign, MapPin, Phone, Building, Edit3, Save, X } from 'lucide-react';
import { onboardingSchema, OnboardingFormData } from '@/components/onboarding/schema';
import onboardingService from '@/services/onboardingService';
import FormInput from '@/components/form/FormInput';
import FormSelect from '@/components/form/FormSelect';
import FormPhoneInput from '@/components/form/FormPhoneInput';
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { moneySpentForOneImageOptions, softwareOptions, statusOptions } from '../onboarding/constants';

// Type for onboarding data returned from API
type OnboardingData = Record<string, any>;

const OnboardingDataCard: React.FC = () => {
  const { shouldShowQuestionnaire } = useOnboarding();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm({
    resolver: zodResolver(onboardingSchema) as any,
    mode: 'onBlur' as const,
    reValidateMode: 'onBlur' as const,
    defaultValues: {
      software: '',
      status: '',
      moneySpentForOneImage: '',
      companyName: '',
      streetAndNumber: '',
      city: '',
      postcode: '',
      state: '',
      country: '',
      phoneNumber: '',
      whatsappConsent: false,
      privacyTermsConsent: false,
    }
  });

  // Fetch onboarding data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await onboardingService.checkOnboardingStatus();
        if (response.success && response.data) {
          setOnboardingData(response.data);
          // Populate form with existing data - only set values for fields that exist in the schema
          const validFields = ['software', 'status', 'moneySpentForOneImage', 'companyName', 'streetAndNumber', 'city', 'postcode', 'state', 'country', 'phoneNumber', 'whatsappConsent', 'privacyTermsConsent'];
          Object.entries(response.data).forEach(([key, value]) => {
            if (validFields.includes(key)) {
              if (key === 'whatsappConsent' || key === 'privacyTermsConsent') {
                methods.setValue(key as any, Boolean(value));
              } else if (value !== null && value !== undefined && value !== '') {
                methods.setValue(key as any, String(value));
              }
            }
          });
        }
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [methods]);

  // Don't show if onboarding is not completed or still loading
  if (shouldShowQuestionnaire || isLoading || !onboardingData) {
    return null;
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form to original data - only reset fields that exist in the schema
    const validFields = ['software', 'status', 'moneySpentForOneImage', 'companyName', 'streetAndNumber', 'city', 'postcode', 'state', 'country', 'phoneNumber'];
    Object.entries(onboardingData).forEach(([key, value]) => {
      if (validFields.includes(key) && value !== null && value !== undefined && value !== '') {
        methods.setValue(key as any, String(value));
      }
    });
    setIsEditing(false);
  };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      await onboardingService.updateOnboardingData(data as OnboardingFormData);
      setOnboardingData(data as OnboardingData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating onboarding data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (icon: React.ReactNode, label: string, children: React.ReactNode) => (
    <div className="flex items-center space-x-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        {children}
      </div>
    </div>
  );

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
                  onClick={methods.handleSubmit(handleSave)}
                  disabled={isSaving}
                  className="text-black !px-4 flex items-center flex-shrink-0 py-1 rounded-none !bg-white shadow-sm text-sm h-full transition-colors cursor-pointer hover:shadow-md font-medium gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <FormProvider {...methods}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Personal Details</h4>
              
              {renderField(
                <Briefcase className="h-5 w-5" />,
                "Status",
                isEditing ? (
                  <FormSelect 
                    name="status" 
                    options={statusOptions}
                  />
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">
                    {onboardingData.status}
                  </Badge>
                )
              )}

              {renderField(
                <MapPin className="h-5 w-5" />,
                "Address",
                isEditing ? (
                  <div className="space-y-2">
                    <FormInput
                      name="streetAndNumber"
                      placeholder="Street & Number"
                      autoComplete="address-line1"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput
                        name="city"
                        placeholder="City"
                        autoComplete="address-level2"
                      />
                      <FormInput
                        name="postcode"
                        placeholder="Postcode"
                        autoComplete="postal-code"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormInput
                        name="state"
                        placeholder="State"
                        autoComplete="address-level1"
                      />
                      <FormInput
                        name="country"
                        placeholder="Country"
                        autoComplete="country"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{onboardingData.streetAndNumber || 'N/A'}</p>
                    <p className="text-gray-600">
                      {[
                        onboardingData.city,
                        onboardingData.state,
                        onboardingData.postcode
                      ].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                    {onboardingData.country && (
                      <p className="text-gray-600">{onboardingData.country}</p>
                    )}
                  </div>
                )
              )}

              {renderField(
                <Phone className="h-5 w-5" />,
                "Phone Number",
                isEditing ? (
                  <FormPhoneInput 
                    name="phoneNumber"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{parsePhoneNumberFromString(onboardingData.phoneNumber)?.formatInternational() || 'N/A'}</p>
                )
              )}

              {renderField(
                <Building className="h-5 w-5" />,
                "Company Name",
                isEditing ? (
                  <FormInput
                    name="companyName"
                    placeholder="Enter company name"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{onboardingData.companyName || 'N/A'}</p>
                )
              )}
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Professional Details</h4>
              
              {renderField(
                <Monitor className="h-5 w-5" />,
                "Software",
                isEditing ? (
                  <FormSelect 
                    name="software" 
                    options={softwareOptions}
                  />
                ) : (
                  <span className="font-medium text-gray-900">{onboardingData.software}</span>
                )
              )}

              {renderField(
                <DollarSign className="h-5 w-5" />,
                "Outsourcing Budget",
                isEditing ? (
                  <FormSelect 
                    name="moneySpentForOneImage" 
                    options={moneySpentForOneImageOptions}
                  />
                ) : (
                  <p className="font-medium text-gray-900">{onboardingData.moneySpentForOneImage}</p>
                )
              )}
            </div>
          </div>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default OnboardingDataCard;
