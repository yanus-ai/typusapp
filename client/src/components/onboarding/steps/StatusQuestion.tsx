import FormRadioGroup from "@/components/form/FormRadioGroup";
import { statusOptions } from "../constants";

export default function StatusQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Which status are you in?
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="status" options={statusOptions} />
      </div>
    </div>
  );
}
