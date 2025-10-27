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
  phoneNumber: z
    .string()
    .optional()
    .default("")
    .refine((value) => {
      if (!value) return true;
      // E.164 format: + followed by up to 15 digits (no spaces/dashes)
      const regex = /^\+?[1-9]\d{1,14}$/;
      return regex.test(value.trim());
    }, "Please enter a valid phone number")
    .transform((value) => `+${value.trim().replace("+", "")}`),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
