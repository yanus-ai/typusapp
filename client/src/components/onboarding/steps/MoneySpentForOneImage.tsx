import FormRadioGroup from "@/components/form/FormRadioGroup";
import { moneySpentForOneImageOptions } from "../constants";

export default function MoneySpentForOneImageQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        If you outsource it, how much money do you spend for one image?
      </h2>
      <div className="space-y-3">
        <FormRadioGroup name="moneySpentForOneImage" options={moneySpentForOneImageOptions} />
      </div>
    </div>
  );
}
