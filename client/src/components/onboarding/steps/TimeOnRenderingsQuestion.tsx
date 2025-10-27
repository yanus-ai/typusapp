import FormRadioGroup from "@/components/form/FormRadioGroup";
import { timeOnRenderingsOptions } from "../constants";

export default function TimeOnRenderingsQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        How much time do you spend on renderings?
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="timeOnRenderings" options={timeOnRenderingsOptions} />
      </div>
    </div>
  );
}
