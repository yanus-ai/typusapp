import FormInput from "@/components/form/FormInput";
import { useClientLanguage } from "@/hooks/useClientLanguage";
import { getOnboardingTranslations } from "../translations";

export default function InformationQuestion() {
  const language = useClientLanguage()
  const t = getOnboardingTranslations(language);
  
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t.provideInformation}
      </h2>
      <div className="space-y-4">
        {/* Contact Information */}
        <div className="border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              name="firstName"
              label={t.firstName}
              type="text"
              placeholder={t.firstNamePlaceholder}
              autoComplete="given-name"
            />
            <FormInput
              name="lastName"
              label={t.lastName}
              type="text"
              placeholder={t.lastNamePlaceholder}
              autoComplete="family-name"
            />
          </div>
        </div>
        
        <FormInput
          name="companyName"
          label={t.companyName}
          type="text"
          placeholder={t.companyNamePlaceholder}
        />
      </div>
    </div>
  );
}
