import { z } from "zod";

export const onboardingSchema = z.object({
  software: z.string().min(1, "Please select a software").default(""),
  status: z.string().min(1, "Please select your status").default(""),
  moneySpentForOneImage: z
    .string()
    .min(1, "Please select an option")
    .default(""),
  timeOnRenderings: z.string().optional().or(z.literal("")).default(""),
  companyName: z.string().optional().or(z.literal("")).default(""),
  streetAndNumber: z.string().optional().or(z.literal("")).default(""),
  city: z.string().optional().or(z.literal("")).default(""),
  postcode: z.string().optional().or(z.literal("")).default(""),
  state: z.string().optional().or(z.literal("")).default(""),
  country: z.string().optional().or(z.literal("")).default(""),
  firstName: z.string().min(1, "First name is required").default(""),
  lastName: z.string().min(1, "Last name is required").default(""),
  phoneNumber: z
    .string()
    .optional()
    .default("")
    .refine((value) => {
      if (!value || value.trim() === "") return true;
      // E.164 format: + followed by up to 15 digits (no spaces/dashes)
      const regex = /^\+?[1-9]\d{1,14}$/;
      return regex.test(value.trim());
    }, "Please enter a valid phone number")
    .transform((value) => {
      if (!value || value.trim() === "") return "";
      return `+${value.trim().replace("+", "")}`;
    }),
  whatsappConsent: z
    .boolean()
    .default(false),
  privacyTermsConsent: z
    .boolean()
    .default(false),
}).superRefine((data, ctx) => {
  // If phone number is provided, both consents are required
  if (data.phoneNumber && data.phoneNumber.trim() !== "") {
    if (!data.whatsappConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['whatsappConsent'],
        message: "You must consent to WhatsApp communication to provide your phone number",
      });
    }
    if (!data.privacyTermsConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privacyTermsConsent'],
        message: "You must agree to the Privacy Policy and Terms of Service to provide your phone number",
      });
    }
  }
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
