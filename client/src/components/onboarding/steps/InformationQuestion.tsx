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
      </div>
    </div>
  );
}
