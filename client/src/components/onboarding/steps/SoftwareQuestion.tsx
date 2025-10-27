import FormRadioGroup from "@/components/form/FormRadioGroup";
import { softwareOptions } from "../constants";

export default function SoftwareQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Which software do you use?
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="software" options={softwareOptions} />
      </div>
    </div>
  );
}
