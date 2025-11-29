import { useWizard } from "react-use-wizard";
import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { getOnboardingTranslations } from "./translations";

export default function OnboardingHeader() {
  const { activeStep, stepCount } = useWizard();
  const { user } = useAppSelector((state) => state.auth);
  console.log('user', user);
  const t = getOnboardingTranslations(user?.language);
  const progress = useMemo(
    () => Math.round((activeStep / stepCount) * 100),
    [activeStep, stepCount]
  );

  return (
    <div className="relative w-full">
      {/* Header */}
      {activeStep < 3 ? (
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t.welcomeTitle}
          </h1>
          <p className="text-gray-600">
            {t.welcomeDescription}
          </p>
        </div>
      ) : (
        ""
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            {t.questionOf.replace('{current}', String(activeStep + 1)).replace('{total}', String(stepCount))}
          </span>
          <span>{t.percentComplete.replace('{percent}', String(progress))}</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-400/30 border border-gray-300/50">
          <div 
            className="bg-white h-full transition-all duration-300 ease-out rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
