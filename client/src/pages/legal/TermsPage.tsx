import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Linkedin, Instagram } from 'lucide-react';
import TypusLogoBlack from '@/assets/images/typus_logo_black.png';

const TermsPage: FC = () => {
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
          <div className="md:p-8 space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">TERMS OF SERVICE</h1>
              <p className="text-lg text-gray-600 mt-2">General Terms and Conditions for TYPUS.AI formerly typus.ai</p>
            </div>
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Scope</h2>
              <p>These General Terms and Conditions (GTC) govern all contracts between TYPUS.AI, an architectural visualization service, and its customers. Any deviations from these terms require explicit written agreement from TYPUS.AI.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Service Overview</h2>
              <p>TYPUS.AI offers AI-powered architectural visualization services through a subscription-based model. The service is provided as per the terms of the customer's selected subscription plan.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Subscription and Payment</h2>
              <h3 className="text-lg font-medium mb-2">3.1 Fixed Monthly Fee</h3>
              <p>Customers agree to pay a fixed monthly subscription fee. This fee will be automatically billed and collected via the Stripe payment platform. The specific pricing and payment terms will be as outlined in the effective price list at the time of contract initiation.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">3.2 Payment Processing</h3>
              <p>All payments are processed securely through Stripe. The customer is responsible for ensuring that payment details are accurate and up to date.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Subscription Duration and Cancellation</h2>
              <h3 className="text-lg font-medium mb-2">4.1 Contract Term</h3>
              <p>The subscription has a minimum term of one month or one year and will automatically renew unless canceled prior to the end of the current period.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">4.2 Cancellation</h3>
              <p>Customers may cancel their subscription at any time, effective at the end of the current billing cycle.</p>

              <p>You may cancel your subscription at any time via any of the following methods:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Directly within the app at <a href="https://app.typus.ai" className='text-blue-600 hover:text-blue-800 cursor-pointer'>app.typus.ai</a></li>
                <li>By email at <a href="mailto:hello@TYPUS.AI" className='text-blue-600 hover:text-blue-800 cursor-pointer'>hello@TYPUS.AI</a></li>
                <li>By submitting a support ticket within the app</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Payment Obligations</h2>
              <p>The subscription fee is payable in advance and will be automatically debited at the start of each billing period. Failure to make timely payments may result in service suspension or termination.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Sales Tax</h2>
              <p>All applicable statutory sales taxes will be added to the invoiced amount based on the customer's location and legal requirements.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Default and Late Payments</h2>
              <p>In the event of late payment, TYPUS.AI reserves the right to charge interest on the overdue amount at a rate of 8 percentage points above the base interest rate, along with applicable reminder and collection fees. The customer is responsible for any costs incurred due to legal actions related to the collection of unpaid fees.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Refunds</h2>
              <p><strong>Non-Refundable Subscription Policy: THERE IS A STRICT NO REFUND POLICY.</strong></p>

              <p>Please note that all purchases are final. Due to the immediate access granted to our digital services upon subscription, we uphold a strict no refund policy.</p>

              <p>This policy also reflects the nature of our offering as a Business-to-Business (B2B) service, where NO consumer protection and refund standards apply.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">Plan Upgrades and Downgrades</h3>
              <p><strong>Upgrades:</strong> You may upgrade to a higher-tier plan at any time during the subscription period. Any additional costs will be billed on a pro-rated basis for the remainder of the subscription term.</p>

              <p><strong>Downgrades:</strong> Downgrades to a lower-tier plan will take effect at the end of the current subscription period, with no refund for the difference.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">Annual Plan Discount</h3>
              <p>The annual subscription plan is offered at a discounted rate compared to the monthly subscription plan. This discounted rate reflects the commitment for a full year of service.</p>
              <p>By subscribing to the annual plan, you agree to pay for the entire subscription period, subject to the refund terms outlined above.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">Cancellation Policy</h3>
              <p>You may cancel your subscription at any time to prevent auto-renewal for the next billing cycle. However, cancellations must be made before the start of the upcoming billing period. Once a billing cycle has begun, the subscription is active for that full period and is strictly non-refundable, as the service is made available immediately.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">General Conditions</h3>
              <ul className="list-disc ml-6">
                <li>By subscribing to the plan, you acknowledge and agree to these terms.</li>
                <li>We reserve the right to modify these terms at any time, with updates communicated via email or on our website.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Copyright</h2>
              <p>TYPUS.AI retains all copyrights and associated rights to the works produced in accordance with § 2 of the German Copyright Act (UrhG).</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Rights of Use</h2>
              <p>Upon full payment, the customer is granted the rights to use the delivered work for the agreed purpose. Any transfer of these rights to third parties requires prior written approval from TYPUS.AI.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Publication and Credits</h2>
              <p>If images generated by TYPUS.AI are published in printed or digital formats (e.g., newspapers, magazines, websites, brochures), TYPUS.AI must be credited as the creator. The agency retains the right to use any work produced for promotional purposes on its website and social media platforms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Data Protection</h2>
              <p>TYPUS.AI complies with all applicable data protection laws. Detailed information on how personal data is handled can be found in our Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Amendments to Terms and Conditions</h2>
              <p>TYPUS.AI reserves the right to modify these terms and conditions at any time. Customers will be notified of any changes, which will take effect upon publication on the website.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. Jurisdiction and Applicable Law</h2>
              <p>All disputes arising from or related to this contract will be governed exclusively by the laws of the Federal Republic of Germany. The place of jurisdiction is the location of TYPUS.AI's headquarters in Cologne, Germany.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">15. Severability Clause</h2>
              <p>Should any provision of these GTC be deemed invalid or unenforceable, the validity of the remaining provisions shall remain unaffected.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">16. Content Privacy</h2>

              <h3 className="text-lg font-medium mb-2">16.1 Paid Subscription Privacy</h3>
              <p>For users with a paid subscription plan, TYPUS.AI will not share or publish any content without first notifying the author. TYPUS.AI does not access, use, or analyze any data uploaded or created by the user. All such data is automatically and permanently deleted from all servers within 30 days.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">16.2 Content Created During Open Beta Period</h3>
              <p>For users who participated in the open beta period, any content uploaded and images generated through TYPUS.AI were not considered private, as outlined in the terms during the open beta. TYPUS.AI reserved the right to share these results with the broader TYPUS.AI community, including the name of the author, on the TYPUS.AI website. This was done without further notice to the author. However, the author has the right to request the removal of such content from public view at any time by contacting TYPUS.AI. This right to showcase content can be revoked upon the author's request.</p>

              <h3 className="text-lg font-medium mb-2 mt-4">16.3 Content submitted to the community</h3>
              <p>Content that has been actively submitted to the community gallery may be used for marketing purposes and may be shared with other users via email campaigns, social media, and other promotional channels.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">17. Proof of Compliance with GNU Affero General Public License v3</h2>

              <h3 className="text-lg font-medium mb-2">Software Utilized</h3>
              <p><strong>Use of Licensed Technology:</strong> Our services utilize Stable Diffusion XL (SDXL) under the CreativeML Open RAIL++-M License, as published by Stability AI. This use complies with the terms and conditions outlined in the license, including its guidelines for responsible and ethical use.</p>

              <p>Our services incorporate ControlNet, which is utilized under its published open-source license. This use adheres to the terms and conditions specified by the license, including compliance with its responsible use provisions.</p>

              <p>This service incorporates the following open-source software licensed under the GNU Affero General Public License (AGPL) v3: Software Name: Clarity.AI Copyright Holder: © 2023 AUTOMATIC1111</p>
            </section>

          <div className="border-t pt-4 mt-8">
            <p className="text-sm text-gray-600">
              <strong>Effective Date:</strong> 01/20/2025
            </p>
            <p className="text-sm text-gray-600 mt-2">
              These General Terms and Conditions are effective as of March 15, 2024, and apply to all future contracts with TYPUS.AI.
            </p>
          </div>

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

export default TermsPage;