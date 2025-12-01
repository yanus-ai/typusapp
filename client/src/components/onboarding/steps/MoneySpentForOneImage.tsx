import FormRadioGroup from "@/components/form/FormRadioGroup";
import { useClientLanguage } from "@/hooks/useClientLanguage";
import { getOnboardingTranslations } from "../translations";

export default function MoneySpentForOneImageQuestion() {
  const language = useClientLanguage()
  const t = getOnboardingTranslations(language);
  
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t.moneySpentQuestion}
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="moneySpentForOneImage" options={t.moneySpentOptions} />
      </div>
    </div>
  );
}
