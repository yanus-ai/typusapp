export interface Question {
  id: string;
  type: "single" | "text" | "contact";
  question: string;
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface OnboardingData {
  software: string;
  status: string;
  timeOnRenderings: string;
  moneySpentForOneImage: string;
  phoneNumber: string;
  address: string;
  companyName: string;
}
