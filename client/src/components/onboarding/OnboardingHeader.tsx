import { useWizard } from "react-use-wizard";
import { Progress } from "../ui/progress";
import { useMemo } from "react";

export default function OnboardingHeader() {
  const { activeStep, stepCount } = useWizard()
  const progress = useMemo(() => Math.round((activeStep / stepCount) * 100), [activeStep, stepCount])

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome! Let's get to know you better
        </h1>
        <p className="text-gray-600">
          Help us personalize your experience by answering a few quick questions
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {activeStep + 1} of {stepCount}</span>
          <span>{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
