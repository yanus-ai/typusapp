import FormInput from "@/components/form/FormInput";

export default function InformationQuestion() {
  return (
    <div className="relative w-full mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Please provide your information
      </h2>
      <div className="space-y-4">
        {/* Contact Information */}
        <div className="border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              name="firstName"
              label="First Name"
              type="text"
              placeholder="Enter your first name"
              autoComplete="given-name"
            />
            <FormInput
              name="lastName"
              label="Last Name"
              type="text"
              placeholder="Enter your last name"
              autoComplete="family-name"
            />
          </div>
        </div>
        
        <FormInput
          name="companyName"
          label="Company Name"
          type="text"
          placeholder="Enter your company name"
        />
        
        {/* Address Fields */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Address Information</h4>
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
    </div>
  );
}
