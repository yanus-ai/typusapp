import { Wizard } from 'react-use-wizard'
import { Card, CardContent } from '@/components/ui/card';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getOnboardingTranslations } from './translations';
import { useMemo } from 'react';
import { onboardingSchema } from './schema';

// Questionnaire Steps
import SoftwareQuestion from './steps/SoftwareQuestion'
import OnboardingHeader from './OnboardingHeader';
import OnboardingFooter from './OnboardingFooter';
import StatusQuestion from './steps/StatusQuestion';
// import TimeOnRenderingsQuestion from './steps/TimeOnRenderingsQuestion';
import MoneySpentForOneImageQuestion from './steps/MoneySpentForOneImage';
import InformationQuestion from './steps/InformationQuestion';
import PhoneNumberQuestion from './steps/PhoneNumberQuestion';
import TypusLogoBlack from '../common/TypusLogoBlack';
import AddressQuestion from './steps/AddressQuestion';
import { useClientLanguage } from '@/hooks/useClientLanguage';
import { XIcon } from 'lucide-react';

export default function OnboardingQuestionnaire ({ setShowOnboarding }: { setShowOnboarding: (show: boolean) => void }) {
  const language = useClientLanguage();
  const t = getOnboardingTranslations(language);
  
  const schema = useMemo(() => onboardingSchema(t), [t]);
  
  const methods = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
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

  return (
    <div className="relative min-h-screen bg-[#fcfcfd] flex flex-col items-center justify-center p-4">
      <button
        className="absolute top-4 right-4 text-sm text-gray-600 cursor-pointer"
        onClick={() => {
          setShowOnboarding(false);
        }}
      >
        <XIcon />
      </button>
      <div className="flex w-full justify-center">
        <div className="mb-0">
          <TypusLogoBlack className="size-9 mx-auto" />
          <h1 className="mt-2 text-center text-xl font-light font-source-serif tracking-[2.5px]">
            TYPUS.AI
          </h1>
          <p className="mt-2 text-center text-xs text-gray-600 font-medium">
            {t.tagline}
          </p>
        </div>
      </div>

      <Card className="w-full max-w-2xl border-0 shadow-none">
        <CardContent className="px-0">
          <FormProvider {...methods}>
            <Wizard
              header={<OnboardingHeader />}
              footer={<OnboardingFooter />}
              startIndex={0}
            >
              <InformationQuestion />
              <AddressQuestion />
              <SoftwareQuestion />
              <StatusQuestion />
              {/* <TimeOnRenderingsQuestion /> */}
              <MoneySpentForOneImageQuestion />
              <PhoneNumberQuestion />
            </Wizard>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}