import FormInput from "@/components/form/FormInput";

export default function AddressQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Please provide your address
      </h2>
      <div className="space-y-4">        
        {/* Address Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormInput
              name="streetAndNumber"
              label="Street & Number"
              type="text"
              placeholder="Enter street and number"
              autoComplete="address-line1"
            />
          </div>
          <FormInput
            name="city"
            label="City"
            type="text"
            placeholder="Enter city"
            autoComplete="address-level2"
          />
          <FormInput
            name="postcode"
            label="Postcode"
            type="text"
            placeholder="Enter postcode"
            autoComplete="postal-code"
          />
          <FormInput
            name="state"
            label="State/Province"
            type="text"
            placeholder="Enter state or province"
            autoComplete="address-level1"
          />
          <FormInput
            name="country"
            label="Country"
            type="text"
            placeholder="Enter country"
            autoComplete="country"
          />
        </div>
      </div>
    </div>
  );
}
