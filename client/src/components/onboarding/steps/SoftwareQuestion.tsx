import FormRadioGroup from "@/components/form/FormRadioGroup";
import { getOnboardingTranslations } from "../translations";
import { useClientLanguage } from "@/hooks/useClientLanguage";

export default function SoftwareQuestion() {
  const language = useClientLanguage()
  const t = getOnboardingTranslations(language);
  
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t.whichSoftware}
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="software" options={t.softwareOptions} />
      </div>
    </div>
  );
}
