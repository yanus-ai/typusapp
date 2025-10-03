import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Linkedin, Instagram } from 'lucide-react';
import TypusLogoBlack from '@/assets/images/typus_logo_black.png';

const DataPrivacyPage: FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-site-white flex flex-col">
      {/* Header with Logo */}
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <a href="https://app.typus.ai/" className="flex justify-center">
            <img src={TypusLogoBlack} alt="Typus Logo" className="h-24 w-auto" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">DATA PRIVACY</h1>
            </div>

          <section>
            <p>UNLESS ANY OTHER INFORMATION IS PROVIDED BELOW, THE PROVISION OF YOUR PERSONAL DATA IS NOT REQUIRED BY LAW OR CONTRACTUALLY, NOR IS IT NECESSARY FOR THE CONCLUSION OF A CONTRACT. YOU ARE NOT OBLIGED TO PROVIDE THE DATA. FAILURE TO PROVIDE HAS NO CONSEQUENCES. THIS APPLIES ONLY IF NO OTHER INFORMATION IS MADE IN THE FOLLOWING PROCESSING OPERATIONS. "PERSONAL DATA" MEANS ANY INFORMATION RELATING TO AN IDENTIFIED OR IDENTIFIABLE INDIVIDUAL.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">SERVER LOG FILES</h2>
            <p>YOU CAN VISIT OUR WEBSITES WITHOUT PROVIDING ANY PERSONAL INFORMATION. EVERY TIME OUR WEBSITE IS ACCESSED, USAGE DATA IS TRANSMITTED TO US OR OUR WEB HOST/IT SERVICE PROVIDER THROUGH YOUR INTERNET BROWSER AND STORED IN LOG DATA (SO-CALLED SERVER LOG FILES). THIS STORED DATA INCLUDES, FOR EXAMPLE, THE NAME OF THE PAGE ACCESSED, DATE AND TIME OF ACCESS, THE IP ADDRESS, THE AMOUNT OF DATA TRANSFERRED AND THE REQUESTING PROVIDER. THE PROCESSING IS CARRIED OUT ON THE BASIS OF ART. 6 ABS. 1 LITER. F GDPR OUT OF OUR OVERWHELMING LEGITIMATE INTEREST IN GUARANTEEING THE ERROR-FREE OPERATION OF OUR WEBSITE AND IN IMPROVEMENT OF OUR OFFER.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">CONTACT RESPONSIBLE</h2>
            <p>CONTACT US IF REQUESTED. THE PERSON RESPONSIBLE FOR DATA PROCESSING IS: typus.ai, HUELTZ STR 6, 50933 COLOGNE | TEL: 0221 1206493 | hello@typus.ai | INITIATIVE CUSTOMER CONTACT VIA E-MAIL: IF YOU CONTACT US VIA E-MAIL, WE COLLECT YOUR PERSONAL DATA (NAME, E-MAIL ADDRESS, MESSAGE TEXT) ONLY TO THE EXTENT PROVIDED BY YOU. THE DATA PROCESSING IS USED TO PROCESS AND ANSWER YOUR CONTACT INQUIRIES. IF THE CONTACT IS USED TO IMPLEMENT PRE-CONTRACTUAL MEASURES (E.G. ADVICE ON BUYING INTEREST, PREPARING AN OFFER) OR AFFECTS A CONTRACT ALREADY CLOSED BETWEEN YOU AND US, THIS DATA PROCESSING WILL BE CONDUCTED ON THE BASIS OF ART. 6 ABS.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">USE OF THE E-MAIL ADDRESS FOR SENDING NEWSLETTERS</h2>
            <p>WE USE YOUR E-MAIL ADDRESS, REGARDLESS OF THE CONTRACT PROCESSING, EXCLUSIVELY FOR OUR OWN ADVERTISING PURPOSES FOR SENDING NEWSLETTERS, UNLESS YOU HAVE EXPRESSLY AGREED TO THIS. THE PROCESSING IS CARRIED OUT ON THE BASIS OF ART. 6 ABS. 1 LITER. A GDPR WITH YOUR CONSENT. YOU CAN REVOKE YOUR CONSENT AT ANY TIME WITHOUT AFFECTING THE LAWFULNESS OF THE PROCESSING BASED ON YOUR CONSENT UNTIL REVOKED. YOU CAN UNSUBSCRIBE FROM THE NEWSLETTER AT ANY TIME USING THE RELEVANT LINK IN THE NEWSLETTER OR BY NOTIFYING US. YOUR E-MAIL ADDRESS WILL THEN BE REMOVED FROM THE DISTRIBUTION. YOUR DATA WILL BE PASSED ON TO AN E-MAIL MARKETING SERVICE PROVIDER AS PART OF ORDER PROCESSING. IT WILL NOT BE DISTRIBUTED TO OTHER THIRD PARTIES.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">COOKIES</h2>
            <p>OUR WEBSITE USE COOKIES. COOKIES ARE SMALL TEXT FILES THAT ARE AVAILABLE IN THE INTERNET BROWSER OR STORED BY THE INTERNET BROWSER ON A USER'S COMPUTER SYSTEM. WHEN A USER CALLS UP A WEBSITE, A COOKIE MAY BE SAVED ON THE USER'S OPERATING SYSTEM. THIS COOKIE CONTAINS A CHARACTERISTIC CHARACTER STRING THAT ALLOWS THE BROWSER TO BE CLEARLY IDENTIFIED WHEN THE WEBSITE IS REVISED. COOKIES ARE STORED ON YOUR COMPUTER. THEREFORE, YOU HAVE FULL CONTROL OVER THE USE OF COOKIES. BY SELECTING THE APPROPRIATE TECHNICAL SETTINGS IN YOUR INTERNET BROWSER, YOU CAN BE NOTIFIED BEFORE THE SETTING OF COOKIES AND DECIDE INDIVIDUALLY ON ACCEPTANCE AND PREVENT THE STORAGE OF THE COOKIES AND THE TRANSMISSION OF THE CONTAINED DATA. COOKIES ALREADY SAVED CAN BE DELETED AT ANY TIME. HOWEVER, WE PLEASE NOTE THAT YOU MAY NOT BE ABLE TO USE ALL THE FUNCTIONS OF THIS WEBSITE TO THE FULL EXTENT.</p>

            <p className="mt-4">YOU CAN FIND OUT HOW YOU CAN MANAGE (INCLUDING DEACTIVATION) COOKIES ON THE MAIN BROWSERS BY FOLLOWING THE LINKS BELOW:</p>

            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>CHROME: <a href="https://support.google.com/accounts/answer/61416?hl=de" className="text-blue-600 hover:text-blue-800 underline">HTTPS://SUPPORT.GOOGLE.COM/ACCOUNTS/ANSWER/61416?HL=DE</a></li>
              <li>INTERNET EXPLORER: <a href="https://support.microsoft.com/de-de/help/17442/windows-internet-explorer-delete-manage-cookies" className="text-blue-600 hover:text-blue-800 underline">HTTPS://SUPPORT.MICROSOFT.COM/DE-DE/HELP/17442/WINDOWS-INTERNET-EXPLORER-DELETE-MANAGE-COOKIES</a></li>
              <li>MOZILLA FIREFOX: <a href="https://support.mozilla.org/de/kb/cookies-allow-and-reject" className="text-blue-600 hover:text-blue-800 underline">HTTPS://SUPPORT.MOZILLA.ORG/DE/KB/COOKIES-ALLOW-AND-REJECT</a></li>
              <li>SAFARI: <a href="https://support.apple.com/de-de/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-blue-600 hover:text-blue-800 underline">HTTPS://SUPPORT.APPLE.COM/DE-DE/GUIDE/SAFARI/MANAGE-COOKIES-AND-WEBSITE-DATA-SFRI11471/MAC</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">TECHNICALLY NECESSARY COOKIES</h2>
            <p>UNLESS ANY OTHER INFORMATION IS PROVIDED BELOW IN THE DATA PROTECTION POLICY, WE ONLY USE THESE TECHNICALLY NECESSARY COOKIES FOR THE PURPOSE OF MAKING OUR OFFER MORE USER-FRIENDLY, EFFECTIVE AND SECURE. COOKIES ALSO ALLOW OUR SYSTEMS TO RECOGNIZE YOUR BROWSER EVEN AFTER A PAGE CHANGE AND OFFER YOU SERVICES. SOME FUNCTIONS OF OUR WEBSITE CANNOT BE OFFERED WITHOUT THE USE OF COOKIES. FOR THIS IT IS REQUIRED THAT THE BROWSER BE RECOGNIZED EVEN AFTER A PAGE CHANGE. THE USE OF COOKIES OR COMPARABLE TECHNOLOGIES IS BASED ON § 25 PARA. 2 TTDSG. THE PROCESSING OF YOUR PERSONAL DATA IS BASED ON ART. 6 ABS. 1 LITER. F GDPR FROM OUR OVERWHELMING LEGITIMATE INTEREST IN GUARANTEEING THE OPTIMAL FUNCTIONALITY OF THE WEBSITE AS WELL AS A USER-FRIENDLY AND EFFECTIVE DESIGN OF OUR OFFER. YOU HAVE THE RIGHT TO OBJECT TO THIS PROCESSING OF PERSONAL DATA CONCERNING YOU AT ANY TIME FOR REASONS ARISING FROM YOUR PARTICULAR SITUATION.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">USE OF COOKIE MANAGER</h2>
            <p>WE USE THE COOKIE YES TOOL ON OUR WEBSITE. THE TOOL ALLOWS YOU TO GIVE CONSENT TO DATA PROCESSING THROUGH THE WEBSITE, IN PARTICULAR TO THE SETTING OF COOKIES, AND TO MAKE USE OF YOUR RIGHT TO REVOKE CONSENT THAT HAS ALREADY BEEN GRANTED. THE DATA PROCESSING SERVES THE PURPOSE OF OBTAINING AND DOCUMENTING REQUIRED CONSENT FOR DATA PROCESSING AND THEREFORE COMPLYING WITH LEGAL OBLIGATIONS. COOKIES CAN BE USED. THE FOLLOWING INFORMATION MAY BE COLLECTED AND TRANSMITTED TO CONSENTMANAGER: DATE AND TIME OF PAGE VIEW, INFORMATION ABOUT THE BROWSER YOU USE AND THE DEVICE YOU USE, ANONYMIZED IP ADDRESS, OPT-IN AND OPT-OUT DATA. THIS DATA WILL NOT BE PASSED ON TO OTHER THIRD PARTIES. DATA PROCESSING IS INTENDED TO FULFILL A LEGAL OBLIGATION BASED ON ART. 6 ABS. 1 LITER. C GDPR. MORE INFORMATION ABOUT DATA PROTECTION AT CONSENTMANAGER CAN BE FOUND AT:</p>

            <p className="mt-2">
              <a href="https://www.consentmanager.net/privacy.php" className="text-blue-600 hover:text-blue-800 underline">HTTPS://WWW.CONSENTMANAGER.NET/PRIVACY.PHP</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">ANALYSIS ADVERTISING TRACKING</h2>

            <h3 className="text-lg font-medium mb-2 mt-4">USE OF GOOGLE ANALYTICS</h3>
            <p>WE USE THE GOOGLE ANALYTICS WEB ANALYSIS SERVICE OF GOOGLE GOOGLE IRELAND LIMITED (GORDON HOUSE, BARROW STREET, DUBLIN 4, IRELAND; "GOOGLE") ON OUR WEBSITE. THE DATA PROCESSING SERVES THE PURPOSE OF ANALYZING THIS WEBSITE AND ITS VISITORS AS WELL AS FOR MARKETING AND ADVERTISING PURPOSES. TO THIS END, GOOGLE WILL USE THE INFORMATION OBTAINED ON BEHALF OF THE OPERATOR OF THIS WEBSITE TO EVALUATE YOUR USE OF THE WEBSITE, TO COMPILE REPORTS ON WEBSITE ACTIVITIES AND TO PROVIDE OTHER SERVICES RELATED TO WEBSITE USE AND INTERNET USE TO THE WEBSITE OPERATOR. THIS CAN, AMONG OTHERS, THE FOLLOWING INFORMATION IS COLLECTED: IP ADDRESS, DATE AND TIME OF PAGE VIEW, CLICK PATH, INFORMATION ABOUT THE BROWSER YOU USE AND THE DEVICE YOU USE, PAGES VISITED, REFERRER URL (WEB PAGE FROM WHICH YOU ACCESSED OUR WEBSITE), LOCATION DATA, PURCHASE ACTIVITIES. THE IP ADDRESS TRANSMITTED BY YOUR BROWSER AS PART OF GOOGLE ANALYTICS WILL NOT BE COMBINED WITH OTHER GOOGLE DATA.</p>

            <p className="mt-4">BOTH GOOGLE AND US STATE AUTHORITIES HAVE ACCESS TO YOUR DATA. YOUR INFORMATION MAY BE LINKED BY GOOGLE TO OTHER INFORMATION, SUCH AS YOUR SEARCH HISTORY, YOUR PERSONAL ACCOUNTS, YOUR OTHER DEVICE USAGE DATA, AND ANY OTHER INFORMATION THAT GOOGLE HAVE ABOUT YOU. IP ANONYMIZATION IS ENABLED ON THIS WEBSITE. THIS WILL BE PREVIOUSLY SHORTENED BY GOOGLE WITHIN MEMBERS OF THE EUROPEAN UNION OR OTHER STATES CONTRACTING TO THE AGREEMENT ON THE EUROPEAN ECONOMIC AREA. ONLY IN EXCEPTIONAL CASES WILL THE FULL IP ADDRESS BE TRANSMITTED TO A GOOGLE SERVER IN THE USA AND SHORTENED THERE. THE PROCESSING OF YOUR PERSONAL DATA IS BASED ON ART. 6 ABS. 1 LITER. F GDPR DUE TO OUR OVERWHELMING LEGITIMATE INTEREST IN THE NEED-BASED AND TARGETED DESIGN OF THE WEBSITE. YOU HAVE THE RIGHT TO OBJECT TO THIS PROCESSING OF PERSONAL DATA CONCERNING YOU AT ANY TIME FOR REASONS ARISING FROM YOUR PARTICULAR SITUATION. YOU CAN PREVENT THE COLLECTION OF THE DATA GENERATED BY GOOGLE ANALYTICS AND RELATED TO YOUR USE OF THE WEBSITE (INCLUDING YOUR IP ADDRESS) TO GOOGLE AND THE PROCESSING OF THIS DATA BY GOOGLE BY DOWNLOADING THE BROWSER PLUG-IN AVAILABLE AT THE FOLLOWING LINK AND INSTALL:</p>

            <p className="mt-2">
              <a href="https://tools.google.com/dlpage/gaoptout?hl=de" className="text-blue-600 hover:text-blue-800 underline">HTTPS://TOOLS.GOOGLE.COM/DLPAGE/GAOPTOUT?HL=DE</a>
            </p>

            <p className="mt-4">TO PREVENT DATA COLLECTION AND STORAGE BY GOOGLE ANALYTICS ACROSS DEVICES, YOU CAN SET AN OPT-OUT COOKIE. OPT-OUT COOKIES PREVENT THE FUTURE COLLECTION OF YOUR DATA WHEN VISITING THIS WEBSITE. YOU MUST OPT-OUT ON ALL SYSTEMS AND DEVICES USED FOR THIS TO BE FULLY EFFECTIVE. IF YOU DELETE THE OPT-OUT COOKIE, REQUESTS WILL BE SUBMITTED TO GOOGLE AGAIN. IF YOU CLICK HERE THE OPT-OUT COOKIE WILL BE SET: DEACTIVATE GOOGLE ANALYTICS. FOR MORE INFORMATION ON TERMS OF USE AND PRIVACY, SEE</p>

            <div className="mt-2 space-y-1">
              <p><a href="https://www.google.com/analytics/terms/de.html" className="text-blue-600 hover:text-blue-800 underline">HTTPS://WWW.GOOGLE.COM/ANALYTICS/TERMS/DE.HTML</a></p>
              <p><a href="https://www.google.de/intl/de/policies/" className="text-blue-600 hover:text-blue-800 underline">HTTPS://WWW.GOOGLE.DE/INTL/DE/POLICIES/</a></p>
              <p><a href="https://policies.google.com/technologies/cookies?hl=de" className="text-blue-600 hover:text-blue-800 underline">HTTPS://POLICIES.GOOGLE.COM/TECHNOLOGIES/COOKIES?HL=DE</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">PLUG-INS AND OTHER</h2>

            <h3 className="text-lg font-medium mb-2">USE OF THE GOOGLE TAG MANAGER</h3>
            <p>WE USE THE GOOGLE TAG MANAGER OF GOOGLE IRELAND LIMITED (GORDON HOUSE, BARROW STREET, DUBLIN 4, IRELAND; "GOOGLE") ON OUR WEBSITE. THIS APPLICATION MANAGES JAVASCRIPT TAGS AND HTML TAGS USED TO IMPLEMENT PARTICULARLY TRACKING AND ANALYSIS TOOLS. THE DATA PROCESSING SERVES THE PURPOSE OF DESIGNING AND OPTIMIZING OUR WEBSITE. THE GOOGLE TAG MANAGER ITSELF NEITHER SAVES COOKIES OR PROCESSES PERSONAL DATA. HOWEVER, IT ALLOWS THE TRIGGER OF OTHER TAGS THAT CAN COLLECT AND PROCESS PERSONAL DATA. FURTHER INFORMATION ABOUT TERMS OF USE AND PRIVACY CAN BE FOUND HERE.</p>

            <h3 className="text-lg font-medium mb-2 mt-4">LINKEDIN PLUGIN</h3>
            <p>We have integrated components from LinkedIn Corporation on this website. LinkedIn is an Internet-based social network that enables users to connect with existing business contacts and make new business contacts.</p>

            <p className="mt-4">The operating company of LinkedIn is LinkedIn Corporation, 2029 Stierlin Court Mountain View, CA 94043, USA. LinkedIn Ireland, Privacy Policy Issues, Wilton Plaza, Wilton Place, Dublin 2, Ireland, is responsible for data protection matters outside the USA.</p>

            <p className="mt-4">Every time you access our website, which is equipped with a LinkedIn component (LinkedIn plug-in), this component causes the browser you are using to download a corresponding representation of the LinkedIn component. Further information about the LinkedIn plug-ins can be found at <a href="https://developer.linkedin.com/plugins" className="text-blue-600 hover:text-blue-800 underline">https://developer.linkedin.com/plugins</a>. As part of this technical process, LinkedIn receives information about which specific subpage of our website you have visited.</p>

            <p className="mt-4">If you are logged in to LinkedIn at the same time, LinkedIn recognizes which specific subpage of our website you are visiting each time you visit our website and for the entire duration of your stay on our website. This information is collected by the LinkedIn component and assigned to your LinkedIn account by LinkedIn. If you click on a LinkedIn button integrated on our website, LinkedIn assigns this information to your personal LinkedIn user account and stores this personal data.</p>

            <p className="mt-4">LinkedIn always receives information via the LinkedIn component that you have visited our website if you are logged in to LinkedIn at the same time as you access our website; This occurs regardless of whether you clicked on the LinkedIn component or not. If you do not want this information to be transmitted to LinkedIn in this way, you can prevent the transmission by logging out of your LinkedIn account before accessing our website.</p>

            <p className="mt-4">LinkedIn offers at <a href="https://www.linkedin.com/psettings/guest-controls" className="text-blue-600 hover:text-blue-800 underline">https://www.linkedin.com/psettings/guest-controls</a> the ability to unsubscribe from email messages, SMS messages and targeted ads and manage ad preferences. LinkedIn also uses partners such as Quantcast, Google Analytics, BlueKai, DoubleClick, Nielsen, Comscore, Eloqua and Lotame, who can set cookies. Such cookies can be rejected at <a href="https://www.linkedin.com/legal/cookie-policy" className="text-blue-600 hover:text-blue-800 underline">https://www.linkedin.com/legal/cookie-policy</a>. LinkedIn's applicable data protection regulations are available at <a href="https://www.linkedin.com/legal/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">https://www.linkedin.com/legal/privacy-policy</a>. LinkedIn's cookie policy is available at <a href="https://www.linkedin.com/legal/cookie-policy" className="text-blue-600 hover:text-blue-800 underline">https://www.linkedin.com/legal/cookie-policy</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">PLUGIN REVIT</h2>
            <h3 className="text-lg font-medium mb-2">Data Privacy Points for the typus.ai Revit Plugin</h3>

            <h4 className="text-base font-medium mb-2 mt-4">Data Collection and Usage</h4>
            <p>The plugin collects necessary data for user identification, project synchronization, and login purposes, such as user credentials, project metadata, and system information. This data is gathered directly through user input within the plugin or as part of project data synchronization between Revit and the typus.ai web app. Data is used solely to facilitate architectural visualization services and optimize user experience within the typus.ai platform.</p>

            <h4 className="text-base font-medium mb-2 mt-4">Third-Party Data Sharing and Protection</h4>
            <p>Any third-party services or tools involved in data processing (such as analytics tools, SDKs, or affiliated companies for technical support) adhere to the same strict data protection standards as outlined in this privacy policy. typus.ai only collaborates with trusted partners that comply with GDPR and other applicable data protection regulations, ensuring user data remains secure and private.</p>

            <h4 className="text-base font-medium mb-2 mt-4">Data Retention and Deletion Policy</h4>
            <p>Data is retained only as long as necessary for the intended purposes of the plugin and to comply with legal obligations. Once the data is no longer required, it is securely deleted from typus.ai's systems. For instance, user account data may be retained for the duration of the account's active use, while project data may be retained for as long as required by contractual agreements or legal regulations.</p>

            <h4 className="text-base font-medium mb-2 mt-4">User Consent Withdrawal and Data Deletion Requests</h4>
            <p>End users can withdraw their consent to data processing or request deletion of their data by contacting support. To request data deletion or withdrawal of consent, please email us at hello@typus.ai. Once processed, all requested user data will be deleted, except for data that must be retained due to legal obligations.</p>
          </section>

            <div className="border-t pt-6 mt-8">
              <div className="flex justify-center space-x-6 text-sm">
                <Link
                  to="/terms"
                  className={`hover:text-gray-600 ${location.pathname === '/terms' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
                >
                  Terms of Service
                </Link>
                <Link
                  to="/data-privacy"
                  className={`hover:text-gray-600 ${location.pathname === '/data-privacy' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
                >
                  Data Privacy
                </Link>
                <Link
                  to="/imprint"
                  className={`hover:text-gray-600 ${location.pathname === '/imprint' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
                >
                  Imprint
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center space-y-4">
            {/* Social Icons */}
            <div className="flex space-x-4">
              <a
                href="https://www.linkedin.com/company/100254850"
                className="text-gray-600 hover:text-black transition-colors"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/typus.ai/"
                className="text-gray-600 hover:text-black transition-colors"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-600">
              COPYRIGHT © 2025 | TYPUS.AI ™
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DataPrivacyPage;