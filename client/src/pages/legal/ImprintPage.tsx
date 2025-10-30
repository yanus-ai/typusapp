import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Linkedin, Instagram } from 'lucide-react';
import TypusLogoBlack from '@/assets/images/typus_logo_black_transparent.png';

const ImprintPage: FC = () => {
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
              <h1 className="text-3xl font-bold text-gray-900">IMPRINT</h1>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <section>
              <h2 className="text-xl font-semibold mb-4">GESETZLICHE ANBIETERKENNUNG:</h2>
              <div className="space-y-2">
                <p>YANUS UG (haftungsbeschränkt)</p>
                <p>HUELTZSTR. 6</p>
                <p>50933 KOELN</p>
                <p>DEUTSCHLAND</p>
                <p><strong>TELEFON:</strong> +49 (0) 221 120 6493</p>
                <p><strong>E-MAIL:</strong> <a href="mailto:hello@typus.ai" className="text-blue-600 hover:text-blue-800 underline">hello@typus.ai</a></p>
                <p><strong>UST-IDNR.:</strong> DE454629357</p>
                <p>Umsatzsteuer-Identifikationsnummer gemäß §27 a</p>
                <p>Umsatzsteuergesetz.</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">ALTERNATIVE STREITBEILEGUNG:</h3>
                <p>DIE EUROPÄISCHE KOMMISSION STELLT EINE PLATTFORM</p>
                <p>FÜR DIE AUSSERGERICHTLICHE</p>
                <p>ONLINE-STREITBEILEGUNG</p>
                <p>(OS-PLATTFORM)</p>
                <p>BEREIT, AUFRUFBAR UNTER</p>
                <p>
                  <a
                    href="https://ec.europa.eu/odr"
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    HTTPS://EC.EUROPA.EU/ODR
                  </a>
                </p>
              </div>
            </section>

            {/* Right Column */}
            <section>
              <div className="space-y-4 leading-relaxed">
                <p>YANUS UG constantly checks and updates the information on its website. Despite all care, data and information of any kind may have changed in the meantime. No liability, guarantee or other responsibility can therefore be assumed for the topicality, correctness and completeness of the information provided.</p>

                <p>The same applies to all other websites that are linked directly via hyperlink or in another way. YANUS UG is not responsible for the content of the websites reached as a result of such connections or references.</p>

                <p>YANUS UG expressly disclaims any form of liability – whether contractual liability, tort liability, strict liability or any other liability for direct or indirect damages, compensation for incidental damages, penalties including compensatory damages or specific damages resulting from or in connection with the fact that typus.ai . AI Studio site may be accessed, used or unused, or with any failure of performance, interruption, defect, delay in transmission, computer virus or other harmful element or line or system failure in connection with the typus.ai website, regardless of whether whether typus.ai is aware of the possibility of such damage or not.</p>

                <p>Furthermore, YANUS UG reserves the right to make changes or additions to the information provided at any time.</p>

                <p>The content, structure and design of the typus.ai website are protected by copyright. The reproduction, modification, representation, distribution, transmission, publication, sale, licensing, processing, alienation or use of information or data for whatever purposes, in particular the use of texts, parts of texts or images, requires the written consent of YANUS UG.</p>

                <p>This disclaimer of liability is to be viewed as part of the Internet offering from which reference was made to this page. If parts or formulations of this text do not, no longer or do not completely correspond to the applicable legal situation, the remaining parts of the document remain unaffected in their content and validity.</p>
              </div>
            </section>
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

export default ImprintPage;