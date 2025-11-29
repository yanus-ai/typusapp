import FormInput from "@/components/form/FormInput";
import { useAppSelector } from "@/hooks/useAppSelector";
import { getOnboardingTranslations } from "../translations";

export default function AddressQuestion() {
  const { user } = useAppSelector((state) => state.auth);
  const t = getOnboardingTranslations(user?.language);
  
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {t.provideAddress}
      </h2>
      <div className="space-y-4">        
        {/* Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormInput
              name="streetAndNumber"
              label={t.streetAndNumber}
              type="text"
              placeholder={t.streetAndNumberPlaceholder}
              autoComplete="address-line1"
            />
          </div>
          <FormInput
            name="city"
            label={t.city}
            type="text"
            placeholder={t.cityPlaceholder}
            autoComplete="address-level2"
          />
          <FormInput
            name="postcode"
            label={t.postcode}
            type="text"
            placeholder={t.postcodePlaceholder}
            autoComplete="postal-code"
          />
          <FormInput
            name="state"
            label={t.stateProvince}
            type="text"
            placeholder={t.stateProvincePlaceholder}
            autoComplete="address-level1"
          />
          <FormInput
            name="country"
            label={t.country}
            type="text"
            placeholder={t.countryPlaceholder}
            autoComplete="country"
          />
        </div>
      </div>
    </div>
  );
}
