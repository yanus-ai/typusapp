export const onboardingTranslations = {
  en: {
    // OnboardingPopup
    popupSteps: [
      " TYPUS.AI is designed to give architects full creative control. The workflow is organized into three sections: Create, Edit, and Refine. Together, they make it easy to turn ideas into polished images.",
      " First, by clicking the top-right corner, you can manage your account, download plugins, and subscribe to a plan.",
      " From here, you can enter the Gallery to organize your images and dynamically send them to different sections.",
      " Once inside a mode, you'll find the Session History on the sides. You can switch between your previous sessions or create a new one by clicking the plus icon.",
      " Here you can upload your base image, open the catalog to add keywords, and generate a prompt based on your selection.",
      " Here you can choose your AI model and customize the output settings, including aspect ratio, resolution, and number of variations.",
      " To have even more control over regions, select 1) the SDXL AI Model. 2) and then upload a color map via \"Create Regions\". Then you can precisely assign materials from our catalog. Alternatively, you can use our plugin integrations - then everything happens automatically.", // Step 6: Color Map Dialog (shown via actual dialog)
      " You can upload your own texture samples or drag and drop textures from our catalog. Click on the texture boxes to upload wall or surrounding textures for better control over your designs.", // Step 8: Texture Info Dialog (shown via actual dialog)
      " In the center, you will see the main canvas. By clicking on an image, you can access different settings. Subscribe to a plan to get started Let's go!", // Step 7
    ],
    back: "Back",
    next: "Next",
    viewPlans: "View Plans",
    
    // OnboardingHeader
    welcomeTitle: "Welcome! Let's get to know you better",
    welcomeDescription: "Help us personalize your experience by answering a few quick questions",
    questionOf: "Question {current} of {total}",
    percentComplete: "{percent}% complete",
    
    // OnboardingFooter
    previous: "Previous",
    complete: "Complete",
    completing: "Completing...",
    loading: "Loading...",
    illDoThisLater: "I'll do this later",
    
    // OnboardingQuestionnaire
    tagline: "AI-Powered Architectural Visualization",
    
    // InformationQuestion
    provideInformation: "Please provide your information",
    firstName: "First Name",
    firstNamePlaceholder: "Enter your first name",
    lastName: "Last Name",
    lastNamePlaceholder: "Enter your last name",
    companyName: "Company Name",
    companyNamePlaceholder: "Enter your company name",
    
    // AddressQuestion
    provideAddress: "Please provide your address",
    streetAndNumber: "Street & Number",
    streetAndNumberPlaceholder: "Enter street and number",
    city: "City",
    cityPlaceholder: "Enter city",
    postcode: "Postcode",
    postcodePlaceholder: "Enter postcode",
    stateProvince: "State/Province",
    stateProvincePlaceholder: "Enter state or province",
    country: "Country",
    countryPlaceholder: "Enter country",
    
    // SoftwareQuestion
    whichSoftware: "Which software do you use?",
    
    // StatusQuestion
    whichStatus: "Which status are you in?",
    
    // MoneySpentForOneImage
    moneySpentQuestion: "If you outsource it, how much money do you spend for one image?",
    
    // PhoneNumberQuestion
    whatsappNumber: "What is your WhatsApp number?",
    whatsappInfo: "Enter your WhatsApp number to get more exclusive deals and support",
    whatsappNumberOptional: "WhatsApp Number (optional)",
    whatsappConsent: "By submitting this form, I agree to be contacted by Typus via WhatsApp at the phone number provided, for the purpose of receiving information about products, updates, and offers. I understand that I can withdraw my consent at any time by replying \"STOP\" or contacting ",
    whatsappConsentEmail: "support@typus.ai",
    whatsappConsentAfterEmail: ". I have read and agree to the ",
    whatsappConsentPrivacyPolicy: "Privacy Policy",
    whatsappConsentEnd: ".",
    privacyTermsConsent: "I agree to the ",
    privacyTermsConsentTerms: "Terms of Service",
    privacyTermsConsentAnd: " and ",
    privacyTermsConsentPrivacy: "Privacy Policy",
    privacyTermsConsentEnd: ".",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    
    // Schema validation messages
    selectSoftware: "Please select a software",
    selectStatus: "Please select your status",
    selectOption: "Please select an option",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    validPhoneNumber: "Please enter a valid phone number",
    whatsappConsentRequired: "You must consent to WhatsApp communication to provide your phone number",
    privacyTermsConsentRequired: "You must agree to the Privacy Policy and Terms of Service to provide your phone number",
    
    // Constants
    softwareOptions: [
      { label: "Revit", value: "Revit" },
      { label: "Archicad", value: "Archicad" },
      { label: "Sketch", value: "Sketch" },
      { label: "Rhino", value: "Rhino" },
      { label: "Other", value: "Other" },
    ],
    statusOptions: [
      { label: "Architectural Student", value: "Architectural Student" },
      { label: "Architectural Employee", value: "Architectural Employee" },
      { label: "Self employed Architect", value: "Self employed Architect" },
      { label: "3D Artist", value: "3D Artist" },
    ],
    moneySpentOptions: [
      { label: "under 500 USD", value: "under 500 USD" },
      { label: "500 - 1500 USD", value: "500 - 1500 USD" },
      { label: "more than 1500 USD", value: "more than 1500 USD" },
    ],
  },
  de: {
    // OnboardingPopup
    popupSteps: [
      " TYPUS.AI wurde entwickelt, um Architekten vollständige kreative Kontrolle zu geben. Der Workflow ist in drei Bereiche organisiert: Erstellen, Bearbeiten und Verfeinern. Zusammen machen sie es einfach, Ideen in polierte Bilder zu verwandeln.",
      " Zuerst können Sie durch Klicken auf die obere rechte Ecke Ihr Konto verwalten, Plugins herunterladen und einen Plan abonnieren.",
      " Von hier aus können Sie in die Galerie eintreten, um Ihre Bilder zu organisieren und sie dynamisch an verschiedene Bereiche zu senden.",
      " Sobald Sie sich in einem Modus befinden, finden Sie die Sitzungshistorie an den Seiten. Sie können zwischen Ihren vorherigen Sitzungen wechseln oder eine neue erstellen, indem Sie auf das Plus-Symbol klicken.",
      " Hier können Sie Ihr Basisbild hochladen, den Katalog öffnen, um Schlüsselwörter hinzuzufügen, und einen Prompt basierend auf Ihrer Auswahl generieren.",
      " Hier können Sie Ihr KI-Modell auswählen und die Ausgabeeinstellungen anpassen, einschließlich Seitenverhältnis, Auflösung und Anzahl der Variationen.",
      " Um noch mehr Kontrolle über Regionen zu haben wählen Sie 1) das SDXL AI Model. 2) und laden Sie anschließend über \"Create Regions\" eine Farbkarte hoch. Dann können Sie Materialien aus unserem Katalog präzise zuweisen. Alternativ können Sie unsere Plugin-Integrationen verwenden - dann geschieht das alles automatisch.", // Step 6: Color Map Dialog (shown via actual dialog)
      " Sie können Ihre eigenen Texturproben hochladen oder Texturen aus unserem Katalog per Drag & Drop hinzufügen. Klicken Sie auf die Texturfelder, um Wand- oder Umgebungstexturen für eine bessere Kontrolle über Ihre Designs hochzuladen.", // Step 8: Texture Info Dialog (shown via actual dialog)
      " In der Mitte sehen Sie die Hauptleinwand. Durch Klicken auf ein Bild können Sie auf verschiedene Einstellungen zugreifen. Abonnieren Sie einen Plan, um loszulegen. Los geht's!", // Step 7
    ],
    back: "Zurück",
    next: "Weiter",
    viewPlans: "Pläne ansehen",
    
    // OnboardingHeader
    welcomeTitle: "Willkommen! Lernen wir Sie besser kennen",
    welcomeDescription: "Helfen Sie uns, Ihr Erlebnis zu personalisieren, indem Sie ein paar kurze Fragen beantworten",
    questionOf: "Frage {current} von {total}",
    percentComplete: "{percent}% abgeschlossen",
    
    // OnboardingFooter
    previous: "Zurück",
    complete: "Abschließen",
    completing: "Wird abgeschlossen...",
    loading: "Wird geladen...",
    illDoThisLater: "Ich mache das später",
    
    // OnboardingQuestionnaire
    tagline: "KI-gestützte Architekturvisualisierung",
    
    // InformationQuestion
    provideInformation: "Bitte geben Sie Ihre Informationen an",
    firstName: "Vorname",
    firstNamePlaceholder: "Geben Sie Ihren Vornamen ein",
    lastName: "Nachname",
    lastNamePlaceholder: "Geben Sie Ihren Nachnamen ein",
    companyName: "Firmenname",
    companyNamePlaceholder: "Geben Sie Ihren Firmennamen ein",
    
    // AddressQuestion
    provideAddress: "Bitte geben Sie Ihre Adresse an",
    streetAndNumber: "Straße & Hausnummer",
    streetAndNumberPlaceholder: "Geben Sie Straße und Hausnummer ein",
    city: "Stadt",
    cityPlaceholder: "Geben Sie die Stadt ein",
    postcode: "Postleitzahl",
    postcodePlaceholder: "Geben Sie die Postleitzahl ein",
    stateProvince: "Bundesland/Provinz",
    stateProvincePlaceholder: "Geben Sie Bundesland oder Provinz ein",
    country: "Land",
    countryPlaceholder: "Geben Sie das Land ein",
    
    // SoftwareQuestion
    whichSoftware: "Welche Software verwenden Sie?",
    
    // StatusQuestion
    whichStatus: "Welchen Status haben Sie?",
    
    // MoneySpentForOneImage
    moneySpentQuestion: "Wenn Sie es auslagern, wie viel Geld geben Sie für ein Bild aus?",
    
    // PhoneNumberQuestion
    whatsappNumber: "Wie lautet Ihre WhatsApp-Nummer?",
    whatsappInfo: "Geben Sie Ihre WhatsApp-Nummer ein, um exklusive Angebote und Support zu erhalten",
    whatsappNumberOptional: "WhatsApp-Nummer (optional)",
    whatsappConsent: "Durch das Absenden dieses Formulars stimme ich zu, dass Typus mich über WhatsApp unter der angegebenen Telefonnummer kontaktieren darf, um Informationen über Produkte, Updates und Angebote zu erhalten. Ich verstehe, dass ich meine Einwilligung jederzeit widerrufen kann, indem ich \"STOP\" antworte oder ",
    whatsappConsentEmail: "support@typus.ai",
    whatsappConsentAfterEmail: " kontaktiere. Ich habe die ",
    whatsappConsentPrivacyPolicy: "Datenschutzrichtlinie",
    whatsappConsentEnd: " gelesen und stimme ihr zu.",
    privacyTermsConsent: "Ich stimme den ",
    privacyTermsConsentTerms: "Nutzungsbedingungen",
    privacyTermsConsentAnd: " und der ",
    privacyTermsConsentPrivacy: "Datenschutzrichtlinie",
    privacyTermsConsentEnd: " zu.",
    privacyPolicy: "Datenschutzrichtlinie",
    termsOfService: "Nutzungsbedingungen",
    
    // Schema validation messages
    selectSoftware: "Bitte wählen Sie eine Software",
    selectStatus: "Bitte wählen Sie Ihren Status",
    selectOption: "Bitte wählen Sie eine Option",
    firstNameRequired: "Vorname ist erforderlich",
    lastNameRequired: "Nachname ist erforderlich",
    validPhoneNumber: "Bitte geben Sie eine gültige Telefonnummer ein",
    whatsappConsentRequired: "Sie müssen der WhatsApp-Kommunikation zustimmen, um Ihre Telefonnummer anzugeben",
    privacyTermsConsentRequired: "Sie müssen der Datenschutzrichtlinie und den Nutzungsbedingungen zustimmen, um Ihre Telefonnummer anzugeben",
    
    // Constants
    softwareOptions: [
      { label: "Revit", value: "Revit" },
      { label: "Archicad", value: "Archicad" },
      { label: "Sketch", value: "Sketch" },
      { label: "Rhino", value: "Rhino" },
      { label: "Andere", value: "Other" },
    ],
    statusOptions: [
      { label: "Architekturstudent", value: "Architectural Student" },
      { label: "Architekturangestellter", value: "Architectural Employee" },
      { label: "Selbstständiger Architekt", value: "Self employed Architect" },
      { label: "3D-Künstler", value: "3D Artist" },
    ],
    moneySpentOptions: [
      { label: "unter 500 USD", value: "under 500 USD" },
      { label: "500 - 1500 USD", value: "500 - 1500 USD" },
      { label: "mehr als 1500 USD", value: "more than 1500 USD" },
    ],
  },
};

export const getOnboardingTranslations = (language: string | null | undefined) => {
  return language === 'de' ? onboardingTranslations.de : onboardingTranslations.en;
};

