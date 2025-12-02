import { FC, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from '@/hooks/useAppSelector';
import subscriptionService, { PricingPlan } from '@/services/subscriptionService';
import { CheckIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';
import Sidebar from '@/components/layout/Sidebar';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import { Link } from 'react-router-dom';
import { useCheckout } from '@/contexts/CheckoutContext';
import onboardingService from '@/services/onboardingService';
import { useClientLanguage } from '@/hooks/useClientLanguage';
import Client1 from '@/assets/images/1619006028822.jpg'
import Client2 from '@/assets/images/1671705944343.jpg'
import { cn } from '@/lib/utils';

// Translations
const translations = {
  en: {
    professionalPlans: "Professional Plans",
    trialNotice: "for professional Architects | Sign up with company email account to get started.",
    perMonth: "/month",
    billedEvery3Months: "billed every 3 months",
    plusVAT: "Plus 19% VAT",
    oneDayFreeTrial: "1-day free trial",
    loading: "Loading...",
    subscribe: "Subscribe",
    manageSubscription: "Manage Subscription",
    upgradePlan: "Upgrade Plan",
    downgradePlan: "Downgrade Plan",
    educationalPlans: "Educational Plans",
    exclusivePricing: "Exclusive pricing for students and educators",
    yearly: "Yearly",
    monthly: "Monthly",
    percentOff: "75% off",
    switchToYearly: "Switch to Yearly to save",
    studentVerificationRequired: "Student Verification Required",
    studentVerificationText: "Educational plans are exclusively available for verified students and educators. Please register with a university email address to verify your status.",
    billedYearly: "Billed yearly",
    billedMonthly: "Billed monthly",
    perYear: "/year",
    saveWithAnnual: "Save {amount} with annual billing 75% off",
    saveWithSixMonth: "Save {amount} with 6-month billing 66% off",
    termsOfService: "Terms of Service",
    dataPrivacy: "Data Privacy",
    imprint: "Imprint",
    failedToLoadPlans: "Failed to load pricing plans",
    failedToStartUpgrade: "Failed to start upgrade process",
    failedToOpenPortal: "Failed to open subscription management",
    educationalPlansOnlyStudents: "Educational plans are only available for verified students",
    // Features
    creditsPerMonth: "CREDITS /month",
    creditsExample: "(e.g. {base} base images and {refinements} Refinements)",
    resolution: "resolution",
    allPluginIntegrations: "all plugin integrations",
    noSupport: "no support",
    noImageEditing: "no image editing",
    noUpscale: "no upscale",
    noCreditTopUps: "no credit top ups",
    emailSupport: "email support",
    imageEditing: "image editing",
    limitedUpscaling: "limited upscaling",
    creditTopUps: "credit top ups",
    editByChat: "edit by chat",
    upscaleUpTo: "upscale up to",
    onboardingVideoCall: "onboarding video call",
    concurrentJobs: "concurrent job",
    concurrentJobsPlural: "concurrent jobs",
    optCreditsTopUps: "OPT. CREDITS TOP UPS",
    unlimitedConcurrentJobs: "UNLIMITED CONCURRENT JOBS",
    integratedRefiner: "INTEGRATED REFINER",
    cancelAnytime: "CANCEL ANYTIME",
    securePaymentStripe: "SECURE PAYMENT ON STRIPE",
    allPluginIntegrationsCaps: "ALL PLUGIN INTEGRATIONS",
    resolutionUpTo: "RESOLUTION UP TO",
    noQueue: "NO QUEUE",
    allFeaturesFromExplorer: "ALL FEATURES FROM EXPLORER",
    premiumLiveVideoCallSupport: "PREMIUM LIVE VIDEO CALL SUPPORT",
    increasedSpeedGeneration: "INCREASED SPEED OF GENERATION",
    student: "Student",
  },
  de: {
    professionalPlans: "Professionelle Pläne",
    trialNotice: "für professionelle Architekten | Registrieren Sie sich mit einem Firmen-E-Mail-Konto, um zu beginnen.",
    perMonth: "/Monat",
    billedEvery3Months: "alle 3 Monate abgerechnet",
    plusVAT: "Zuzüglich 19% MwSt.",
    oneDayFreeTrial: "1-tägige kostenlose Testversion",
    loading: "Wird geladen...",
    subscribe: "Abonnieren",
    manageSubscription: "Abonnement verwalten",
    upgradePlan: "Plan upgraden",
    downgradePlan: "Plan downgraden",
    educationalPlans: "Bildungspläne",
    exclusivePricing: "Exklusive Preise für Studenten und Pädagogen",
    yearly: "Jährlich",
    monthly: "Monatlich",
    percentOff: "75% Rabatt",
    switchToYearly: "Wechseln Sie zu Jährlich, um zu sparen",
    studentVerificationRequired: "Studentenverifizierung erforderlich",
    studentVerificationText: "Bildungspläne sind ausschließlich für verifizierte Studenten und Pädagogen verfügbar. Bitte registrieren Sie sich mit einer Universitäts-E-Mail-Adresse, um Ihren Status zu verifizieren.",
    billedYearly: "Jährlich abgerechnet",
    billedMonthly: "Monatlich abgerechnet",
    perYear: "/Jahr",
    saveWithAnnual: "Sparen Sie {amount} mit jährlicher Abrechnung 75% Rabatt",
    saveWithSixMonth: "Sparen Sie {amount} mit 6-monatiger Abrechnung 66% Rabatt",
    termsOfService: "Nutzungsbedingungen",
    dataPrivacy: "Datenschutz",
    imprint: "Impressum",
    failedToLoadPlans: "Preispläne konnten nicht geladen werden",
    failedToStartUpgrade: "Upgrade-Prozess konnte nicht gestartet werden",
    failedToOpenPortal: "Abonnementverwaltung konnte nicht geöffnet werden",
    educationalPlansOnlyStudents: "Bildungspläne sind nur für verifizierte Studenten verfügbar",
    // Features
    creditsPerMonth: "CREDITS /Monat",
    creditsExample: "(z.B. {base} Basisbilder und {refinements} Verfeinerungen)",
    resolution: "Auflösung",
    allPluginIntegrations: "alle Plugin-Integrationen",
    noSupport: "kein Support",
    noImageEditing: "keine Bildbearbeitung",
    noUpscale: "kein Upscaling",
    noCreditTopUps: "keine Credit-Aufladungen",
    emailSupport: "E-Mail-Support",
    imageEditing: "Bildbearbeitung",
    limitedUpscaling: "begrenztes Upscaling",
    creditTopUps: "Credit-Aufladungen",
    editByChat: "Bearbeitung per Chat",
    upscaleUpTo: "Upscaling bis zu",
    onboardingVideoCall: "Onboarding-Videotelefonat",
    concurrentJobs: "gleichzeitiger Job",
    concurrentJobsPlural: "gleichzeitige Jobs",
    optCreditsTopUps: "OPT. CREDIT-AUFLADUNGEN",
    unlimitedConcurrentJobs: "UNBEGRENZTE GLEICHZEITIGE JOBS",
    integratedRefiner: "INTEGRIERTER VERFEINERER",
    cancelAnytime: "JEDERZEIT KÜNDBAR",
    securePaymentStripe: "SICHERE ZAHLUNG ÜBER STRIPE",
    allPluginIntegrationsCaps: "ALLE PLUGIN-INTEGRATIONEN",
    resolutionUpTo: "AUFLÖSUNG BIS ZU",
    noQueue: "KEINE WARTESCHLANGE",
    allFeaturesFromExplorer: "ALLE FUNKTIONEN VON EXPLORER",
    premiumLiveVideoCallSupport: "PREMIUM LIVE-VIDEOTELEFONAT-SUPPORT",
    increasedSpeedGeneration: "ERHÖHTE GENERIERUNGSGESCHWINDIGKEIT",
    student: "Student",
  },
};

const getTranslations = (language: string | null | undefined) => {
  return language === 'de' ? translations.de : translations.en;
};

export const SubscriptionPage: FC = () => {
  const { subscription } = useAppSelector(state => state.auth);
  const language = useClientLanguage();
  const t = getTranslations(language);
  const { setPendingCheckout } = useCheckout();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [educationalPlans, setEducationalPlans] = useState<PricingPlan[]>([]);
  const [isStudent, setIsStudent] = useState(false);
  // Standard plans only use THREE_MONTHLY, no toggle needed
  const billingCycle = 'THREE_MONTHLY';
  const [educationalBillingCycle, setEducationalBillingCycle] = useState<'MONTHLY' | 'SIX_MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Set initial billing cycle for educational plans based on current subscription
  useEffect(() => {
    if (subscription && subscription.billingCycle && ['MONTHLY', 'YEARLY'].includes(subscription.billingCycle)) {
      setEducationalBillingCycle(subscription.billingCycle as 'MONTHLY' | 'YEARLY');
    } else {
      setEducationalBillingCycle('MONTHLY');
    }
  }, [subscription]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const plansData = await subscriptionService.getPricingPlans();
      setPlans(plansData.regularPlans);
      setEducationalPlans(plansData.educationalPlans);
      setIsStudent(plansData.isStudent);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error(t.failedToLoadPlans);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType: 'STARTER' | 'EXPLORER' | 'PRO') => {
    try {
      setUpgrading(planType);

      // If user has existing subscription, redirect to Stripe portal
      if (subscription && subscription.status === 'ACTIVE') {
        console.log(`🔄 User has active subscription - redirecting to Stripe portal for plan change`);
        await subscriptionService.redirectToPortal();
        setUpgrading(null);
        return;
      }

      // Check onboarding status for new subscriptions
      try {
        const onboardingStatus = await onboardingService.checkOnboardingStatus();
        if (onboardingStatus.success && !onboardingStatus.hasCompleted) {
          // Set pending checkout and show onboarding
          setPendingCheckout({
            planType,
            billingCycle: 'THREE_MONTHLY',
            isEducational: false
          });
          setUpgrading(null);
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Continue to checkout if check fails
      }

      // New subscription - use checkout (standard plans use THREE_MONTHLY)
      console.log(`🔄 Creating new subscription for ${planType}/THREE_MONTHLY`);
      await subscriptionService.redirectToCheckout(planType, 'THREE_MONTHLY', false);

    } catch (error) {
      console.error('Failed to start upgrade process:', error);
      toast.error(t.failedToStartUpgrade);
      setUpgrading(null);
    }
  };

  const handleEducationalUpgrade = async (planType: 'STARTER' | 'EXPLORER' | 'PRO') => {
    if (!isStudent) {
      toast.error(t.educationalPlansOnlyStudents);
      return;
    }

    try {
      setUpgrading(planType);

      // If user has existing subscription, redirect to Stripe portal
      if (subscription && subscription.status === 'ACTIVE') {
        console.log(`🔄 User has active subscription - redirecting to Stripe portal for educational plan change`);
        await subscriptionService.redirectToPortal();
        setUpgrading(null);
        return;
      }

      // Check onboarding status for new subscriptions
      try {
        const onboardingStatus = await onboardingService.checkOnboardingStatus();
        if (onboardingStatus.success && !onboardingStatus.hasCompleted) {
          // Set pending checkout and show onboarding
          setPendingCheckout({
            planType,
            billingCycle: educationalBillingCycle,
            isEducational: true
          });
          setUpgrading(null);
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Continue to checkout if check fails
      }

      // New educational subscription - use checkout
      console.log(`🔄 Creating new educational subscription for ${planType}/${educationalBillingCycle}`);
      await subscriptionService.redirectToCheckout(planType, educationalBillingCycle, true);

    } catch (error) {
      console.error('Failed to start educational upgrade process:', error);
      toast.error(t.failedToStartUpgrade);
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await subscriptionService.redirectToPortal();
    } catch (error) {
      console.error('Failed to open subscription portal:', error);
      toast.error(t.failedToOpenPortal);
    }
  };

  const isCurrentPlan = (planType: string) => {
    return subscription?.planType === planType && subscription?.billingCycle === billingCycle && subscription?.status === 'ACTIVE' && subscription?.isEducational !== true;
  };

  const isCurrentEducationalPlan = (planType: string) => {
    return subscription?.planType === planType && subscription?.billingCycle === educationalBillingCycle && subscription?.status === 'ACTIVE' && subscription?.isEducational === true;
  };

  const canUpgradeToPlan = (planType: string) => {
    if (!subscription || subscription.status !== 'ACTIVE') return true; // No active subscription means they can get any plan

    // If it's the exact same plan and billing cycle, they can't upgrade to it
    if (subscription.planType === planType && subscription.billingCycle === billingCycle) {
      return false;
    }

    // If it's the same plan type but different billing cycle, allow the change
    if (subscription.planType === planType && subscription.billingCycle !== billingCycle) {
      return true;
    }

    // For different plan types, check hierarchy
    const planHierarchy = { 'STARTER': 1, 'EXPLORER': 2, 'PRO': 3 };
    const currentLevel = planHierarchy[subscription.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;

    return targetLevel > currentLevel;
  };

  const canDowngradeToPlan = (planType: string) => {
    if (!subscription || subscription.status !== 'ACTIVE') return false;

    // If it's the exact same plan and billing cycle, they can't downgrade to it
    if (subscription.planType === planType && subscription.billingCycle === billingCycle) {
      return false;
    }

    // If it's the same plan type but different billing cycle, allow the change
    if (subscription.planType === planType && subscription.billingCycle !== billingCycle) {
      return true;
    }

    // For different plan types, check hierarchy
    const planHierarchy = { 'STARTER': 1, 'EXPLORER': 2, 'PRO': 3 };
    const currentLevel = planHierarchy[subscription.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;

    return targetLevel < currentLevel;
  };

  // All subscription changes now go through Stripe Customer Portal

  const getPlanPrice = (plan: PricingPlan) => {
    // Standard plans only use THREE_MONTHLY
    const price = plan.prices.threeMonthly || 0;
    const period = '/3 Months';
    const displayPrice = subscriptionService.formatPrice(price);
    const monthlyEquivalent = `(€${(price / 3 / 100).toFixed(0)}/month)`;
    return { display: `${displayPrice} ${monthlyEquivalent}`, period, threeMonthPrice: price };
  };

  const getEducationalPlanPrice = (plan: PricingPlan) => {
    let price: number;
    let period: string;
    let displayPrice: string;
    
    if (educationalBillingCycle === 'MONTHLY') {
      price = plan.prices.monthly || 0;
      period = '/Month';
      displayPrice = subscriptionService.formatPrice(price);
    } else {
      price = plan.prices.yearly || 0;
      period = '/Year';
      displayPrice = subscriptionService.formatPrice(price);
      const monthlyEquivalent = subscriptionService.getMonthlyEquivalent(price);
      return { display: `${displayPrice} ${monthlyEquivalent}`, period };
    }
    
    return { display: displayPrice, period };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DotLottieReact
          src={loader}
          loop
          autoplay
          style={{ transform: 'scale(3)', width: 80, height: 80 }}
        />
      </div>
    );
  }

  return (
    <MainLayout>
      {/* Sidebar */}
      <Sidebar />

      <div className="w-full px-6 py-8 overflow-auto">
        <div className='max-w-7xl mx-auto'>
          {/* Header */}
          <div className="text-center my-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 font-siggnal">{t.professionalPlans}</h1>
          </div>

          {/* Professional Plans */}
          <div className="mb-8">
            {/* Trial Notice */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-green-50 border border-green-200 rounded-none p-4 mb-4 max-w-2xl">
                <p className="text-green-800 text-center font-semibold">
                  <span className="text-green-600 font-bold">{t.oneDayFreeTrial}</span> {t.trialNotice.split('|')[0]?.trim()} {t.trialNotice.split('|')[1]?.trim()}
                </p>
              </div>
            </div>
            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", {
              "lg:grid-cols-4": language === 'de',
              "lg:grid-cols-3": language === 'en',
            })}>
              {/* Testimonials Section - German Only */}
              {language === 'de' && (
                <div className="flex flex-col gap-6">
                  {/* Christina Maximowitz Testimonial */}
                  <div className="bg-white border border-black rounded-lg p-3 relative" style={{
                    boxShadow: '5px 5px 0px #000000'
                  }}>
                    {/* LinkedIn Logo */}
                    <a 
                      href="https://www.linkedin.com/in/christina-maximowitz/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077B5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    
                    <div className="flex items-start space-x-4 mb-4">
                      <img src={Client1} className="w-12 h-12 rounded-full flex-shrink-0" alt="Christina Maximowitz" />
                      <div className="flex-1">
                        <a 
                          href="https://www.linkedin.com/in/christina-maximowitz/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <h3 className="font-bold text-gray-900 text-base mb-1">Christina Maximowitz</h3>
                        </a>
                        <p className="text-sm text-gray-700 mb-1">Inhaberin Maximowitz</p>
                        <p className="text-sm text-gray-600 mb-2">Innenarchitektur | Strategische Raumkonzepte für Ihre Geschäftsziele</p>
                        <div className="flex items-center text-sm text-gray-700 mb-2">
                          <CheckIcon className="h-3 w-3 mr-1 text-blue-600" />
                          <span>Design trifft Funktion</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-900 text-base mb-4 leading-relaxed">
                      Spannendes Thema! Weiter so!
                    </p>
                    
                    <p className="text-xs text-gray-500">Aug 9, 2024</p>
                  </div>

                  {/* Carsten Ingolf Gösse Testimonial */}
                  <div className="bg-white border border-black rounded-lg p-3 relative" style={{
                    boxShadow: '5px 5px 0px #000000'
                  }}>
                    {/* LinkedIn Logo */}
                    <a 
                      href="https://www.linkedin.com/in/carsten-ingolf-g%C3%B6ssel-6648ab7a/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077B5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    
                    <div className="flex items-start space-x-4 mb-4">
                      <img src={Client2} className="w-12 h-12 rounded-full flex-shrink-0" alt="Carsten Ingolf Gösse" />
                      <div className="flex-1">
                        <a 
                          href="https://www.linkedin.com/in/carsten-ingolf-g%C3%B6ssel-6648ab7a/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <h3 className="font-bold text-gray-900 text-base mb-1">Carsten Ingolf Gösse</h3>
                        </a>
                        <p className="text-sm text-gray-700">Igk Gössel + Kluge . Generalplaner GmbH</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-900 text-base mb-4 leading-relaxed">
                      Gerne von mir- ein interessanter Ansatz, der beim Erlebbarmachen von Entwürfen für Bauherren helfen kann.
                    </p>
                    
                    <p className="text-xs text-gray-500">Aug 9, 2024</p>
                  </div>
                </div>
              )}
              <>
                {plans.map((plan) => {
                  const priceInfo = getPlanPrice(plan);
                  const isCurrent = isCurrentPlan(plan.planType);
                  
                  return (
                    <Card key={plan.planType} className={`relative border-2 bg-black ${
                      isCurrent ? 'border-red-400 shadow-lg' : 'border-transparent'
                    } rounded-none overflow-hidden`}>
                      <CardContent className="p-6 h-full flex flex-col">
                        {/* Plan Name */}
                        <h3 className="text-lg font-semibold mb-4 text-white">
                          {plan.planType}
                        </h3>
                        
                        {/* Price */}
                        <div className="mb-4">
                          <div className="flex items-baseline">
                            <span className="text-3xl font-bold text-white">
                              {subscriptionService.formatPrice(priceInfo.threeMonthPrice / 3)}
                            </span>
                            <span className="text-lg text-white/80 ml-1">
                              {t.perMonth}
                            </span>
                          </div>
                          <p className="text-white/80 mt-1 text-sm">
                            <span className='font-semibold text-white'>{priceInfo.display.split(' ')[0]}</span>
                            <span className='text-white/80'> {t.billedEvery3Months}</span>
                          </p>
                          <p className='text-white/80 mt-2 text-sm'>{t.plusVAT}</p>
                          <p className='text-green-400 mt-2 text-sm font-semibold'>{t.oneDayFreeTrial}</p>
                        </div>
                        
                        
                        {/* Features */}
                        <div className="space-y-3 mb-6 flex-1">
                          {plan.planType === 'STARTER' && (
                            <>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white">50 {t.creditsPerMonth} {t.creditsExample.replace('{base}', '30').replace('{refinements}', '10')}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">2k {t.resolution}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.allPluginIntegrations}</span>
                              </div>
                              <div className="flex items-center">
                                <X className="h-4 w-4 mr-3 flex-shrink-0 text-white/50" />
                                <span className="text-sm text-white/70 uppercase">{t.noSupport}</span>
                              </div>
                              <div className="flex items-center">
                                <X className="h-4 w-4 mr-3 flex-shrink-0 text-white/50" />
                                <span className="text-sm text-white/70 uppercase">{t.noImageEditing}</span>
                              </div>
                              <div className="flex items-center">
                                <X className="h-4 w-4 mr-3 flex-shrink-0 text-white/50" />
                                <span className="text-sm text-white/70 uppercase">{t.noUpscale}</span>
                              </div>
                              <div className="flex items-center">
                                <X className="h-4 w-4 mr-3 flex-shrink-0 text-white/50" />
                                <span className="text-sm text-white/70 uppercase">{t.noCreditTopUps}</span>
                              </div>
                            </>
                          )}
                          {plan.planType === 'EXPLORER' && (
                            <>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white">150 {t.creditsPerMonth} {t.creditsExample.replace('{base}', '100').replace('{refinements}', '10')}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">2k {t.resolution} (2 {t.concurrentJobs})</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.allPluginIntegrations}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.emailSupport}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.imageEditing}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.limitedUpscaling}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.creditTopUps}</span>
                              </div>
                            </>
                          )}
                          {plan.planType === 'PRO' && (
                            <>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">1000 {t.creditsPerMonth} {t.creditsExample.replace('{base}', '800').replace('{refinements}', '40')}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">4k {t.resolution} (4 {t.concurrentJobs})</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.allPluginIntegrations}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.emailSupport}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.imageEditing}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.editByChat}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.upscaleUpTo} 13k</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.creditTopUps}</span>
                              </div>
                              <div className="flex items-center">
                                <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-white" />
                                <span className="text-sm text-white uppercase">{t.onboardingVideoCall}</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        <Button
                          type='button'
                          onClick={
                            isStudent
                              ? undefined
                              : isCurrent
                              ? handleManageSubscription
                              : () => handleUpgrade(plan.planType as 'STARTER' | 'EXPLORER' | 'PRO')
                          }
                          disabled={isStudent}
                          className={`tracking-widest text-sm uppercase px-6 py-2 rounded-none transition-all duration-200 ease-in-out flex items-center justify-center gap-2 ${
                            isStudent
                              ? 'bg-white text-black opacity-70 cursor-not-allowed'
                              : isCurrent
                              ? 'bg-white text-black border border-white'
                              : 'bg-white text-black border border-white hover:bg-transparent hover:text-white hover:border-white'
                          }`}
                        >
                          {upgrading === plan.planType
                            ? t.loading
                            : isCurrent
                            ? t.manageSubscription
                            : !subscription || subscription.status !== 'ACTIVE'
                            ? t.subscribe
                            : canUpgradeToPlan(plan.planType)
                            ? t.upgradePlan
                            : canDowngradeToPlan(plan.planType)
                            ? t.downgradePlan
                            : t.subscribe
                          }
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            </div>
          </div>

          {/* Educational Plans Section */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">🎓 {t.educationalPlans}</h2>
              <p className="text-lg text-gray-700">{t.exclusivePricing}</p>
            </div>

            {/* Educational Plans Billing Toggle */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-white p-1 rounded-full flex mb-2 relative">
                <button
                  onClick={() => setEducationalBillingCycle('YEARLY')}
                  className={`px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out flex items-center gap-2 ${
                    educationalBillingCycle === 'YEARLY'
                      ? 'bg-black text-white border border-black'
                      : 'text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black'
                  }`}
                >
                  {t.yearly}
                  <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full ml-1">{t.percentOff}</span>
                </button>
                <button
                  onClick={() => setEducationalBillingCycle('MONTHLY')}
                  className={`px-4 py-2 rounded-none text-sm font-medium transition-all duration-200 ease-in-out ${
                    educationalBillingCycle === 'MONTHLY'
                      ? 'bg-black text-white border border-black'
                      : 'text-gray-600 border border-transparent hover:border-black hover:bg-transparent hover:text-black'
                  }`}
                >
                  {t.monthly}
                </button>
              </div>
              {educationalBillingCycle === 'YEARLY' && (
                <p className="text-gray-600 text-sm">{t.switchToYearly} <span className="font-semibold">75%</span></p>
              )}
            </div>

            {/* Student verification notice */}
            {!isStudent && (
              <div className="bg-red-500/10 border border-red-300 rounded-none p-5 mb-8 shadow-sm max-w-4xl mx-auto">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-100 rounded-full p-2">
                    <CheckIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-700 text-base mb-1">{t.studentVerificationRequired}</h3>
                    <p className="text-red-600 text-sm leading-relaxed">
                      {t.studentVerificationText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Educational Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {educationalPlans.map((plan) => {
                const priceInfo = getEducationalPlanPrice(plan);
                const isCurrentEdu = isCurrentEducationalPlan(plan.planType);
                
                return (
                  <Card
                    key={`edu-${plan.planType}`}
                    className={`relative rounded-none overflow-hidden bg-white ${
                      isCurrentEdu ? 'border-2 border-red-400 shadow-lg' : 'border border-gray-200'
                    }`}
                  >
                    <CardContent className="p-6 h-full flex flex-col">
                      {/* Plan Name */}
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">
                        {plan.planType} - {t.student}
                      </h3>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-gray-900">
                            {educationalBillingCycle === 'YEARLY' 
                              ? subscriptionService.formatPrice((plan.prices.yearly || 0) / 12)
                              : priceInfo.display.split(' ')[0]
                            }
                          </span>
                          <span className="text-lg text-gray-600 ml-1">{t.perMonth}</span>
                        </div>
                        {educationalBillingCycle === 'YEARLY' ? (
                          <p className="text-gray-600 mt-1">
                            {t.billedYearly} <span className='font-bold text-gray-900'>{`(${subscriptionService.formatPrice(plan.prices.yearly || 0)}${t.perYear})`}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">{t.billedMonthly}</p>
                        )}
                        <p className='text-gray-600 mt-2 text-sm'>{t.plusVAT}</p>
                      </div>
                      
                      {educationalBillingCycle === 'YEARLY' && (
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <span>
                            {t.saveWithAnnual.replace('{amount}', subscriptionService.formatPrice((plan.prices.monthly! * 12) - plan.prices.yearly!))}
                          </span>
                        </div>
                      )}
                      
                      {educationalBillingCycle === 'SIX_MONTHLY' && (
                        <div className="flex items-center text-sm text-gray-600 mb-4">
                          <span>
                            {t.saveWithSixMonth.replace('{amount}', subscriptionService.formatPrice((plan.prices.monthly! * 6) - plan.prices.sixMonthly!))}
                          </span>
                        </div>
                      )}
                      
                      {/* Features */}
                      <div className="space-y-3 mb-6 flex-1">
                        {plan.planType === 'STARTER' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">50 {t.creditsPerMonth} {t.creditsExample.replace('{base}', '30').replace('{refinements}', '10')}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.optCreditsTopUps}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.unlimitedConcurrentJobs}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.integratedRefiner}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.cancelAnytime}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.securePaymentStripe}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.allPluginIntegrationsCaps}</span>
                            </div>
                          </>
                        )}
                        {plan.planType === 'EXPLORER' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">150 {t.creditsPerMonth} {t.creditsExample.replace('{base}', '100').replace('{refinements}', '10')}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.optCreditsTopUps}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">2 {t.concurrentJobsPlural.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.integratedRefiner}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.cancelAnytime}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.securePaymentStripe}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.allPluginIntegrationsCaps}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.resolutionUpTo} 2K</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.noQueue}</span>
                            </div>
                          </>
                        )}
                        {plan.planType === 'PRO' && (
                          <>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">1000 {t.creditsPerMonth} {t.creditsExample.replace('{base}', '800').replace('{refinements}', '40')}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.allFeaturesFromExplorer}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">4 {t.concurrentJobsPlural.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.premiumLiveVideoCallSupport}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.increasedSpeedGeneration}</span>
                            </div>
                            <div className="flex items-center">
                              <CheckIcon className="h-4 w-4 mr-3 flex-shrink-0 text-gray-900" />
                              <span className="text-sm text-gray-700">{t.resolutionUpTo} 13K</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <Button
                        onClick={
                          !isStudent
                            ? undefined
                            : isCurrentEdu
                            ? handleManageSubscription
                            : () => handleEducationalUpgrade(plan.planType)
                        }
                        disabled={!isStudent || upgrading === plan.planType}
                        className={`w-full rounded-none font-medium transition-all duration-200 ease-in-out ${
                          !isStudent
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : isCurrentEdu
                            ? 'bg-gray-900 text-white border border-gray-900'
                            : 'bg-gray-900 text-white border border-gray-900 hover:bg-white hover:text-gray-900'
                        }`}
                      >
                        {upgrading === plan.planType ? (
                          t.loading
                        ) : isCurrentEdu ? (
                          t.manageSubscription
                        ) : (
                          t.subscribe
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-center space-x-6 text-sm mt-20 mb-6">
          <Link
            to="/terms"
            target="_blank"
            className={`hover:text-gray-600 ${location.pathname === '/terms' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
          >
            {t.termsOfService}
          </Link>
          <Link
            to="/data-privacy"
            target="_blank"
            className={`hover:text-gray-600 ${location.pathname === '/data-privacy' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
          >
            {t.dataPrivacy}
          </Link>
          <Link
            to="/imprint"
            target="_blank"
            className={`hover:text-gray-600 ${location.pathname === '/imprint' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
          >
            {t.imprint}
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;