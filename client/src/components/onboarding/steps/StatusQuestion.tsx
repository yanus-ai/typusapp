import FormRadioGroup from "@/components/form/FormRadioGroup";
import { useAppSelector } from "@/hooks/useAppSelector";
import { getOnboardingTranslations } from "../translations";

export default function StatusQuestion() {
  const { user } = useAppSelector((state) => state.auth);
  const t = getOnboardingTranslations(user?.language);
  
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t.whichStatus}
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="status" options={t.statusOptions} />
      </div>
    </div>
  );
}
