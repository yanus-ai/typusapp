import { z } from "zod";
import { getOnboardingTranslations } from "./translations";

export const onboardingSchema = (t: ReturnType<typeof getOnboardingTranslations>) => z.object({
  software: z.string().min(1, t.selectSoftware).default(""),
  status: z.string().min(1, t.selectStatus).default(""),
  moneySpentForOneImage: z
    .string()
    .min(1, t.selectOption)
    .default(""),
  timeOnRenderings: z.string().optional().or(z.literal("")).default(""),
  companyName: z.string().optional().or(z.literal("")).default(""),
  streetAndNumber: z.string().optional().or(z.literal("")).default(""),
  city: z.string().optional().or(z.literal("")).default(""),
  postcode: z.string().optional().or(z.literal("")).default(""),
  state: z.string().optional().or(z.literal("")).default(""),
  country: z.string().optional().or(z.literal("")).default(""),
  firstName: z.string().min(1, t.firstNameRequired).default(""),
  lastName: z.string().min(1, t.lastNameRequired).default(""),
  phoneNumber: z
    .string()
    .optional()
    .default("")
    .refine((value) => {
      if (!value || value.trim() === "") return true;
      // E.164 format: + followed by up to 15 digits (no spaces/dashes)
      const regex = /^\+?[1-9]\d{1,14}$/;
      return regex.test(value.trim());
    }, t.validPhoneNumber)
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
        message: t.whatsappConsentRequired,
      });
    }
    if (!data.privacyTermsConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privacyTermsConsent'],
        message: t.privacyTermsConsentRequired,
      });
    }
  }
});

export type OnboardingFormData = z.infer<ReturnType<typeof onboardingSchema>>;
