import React from 'react';

const DesktopOnlyMessage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-site-white p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-red-500 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Desktop Experience Required
          </h1>

          <p className="text-gray-600 leading-relaxed">
            This application is optimized for desktop browsers and provides the best experience on larger screens.
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            To continue, please:
          </h2>

          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
              <span>Open this link on your desktop computer</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
              <span>Use a desktop browser like Chrome, Firefox, or Safari</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
              <span>Ensure your screen width is at least 769px</span>
            </li>
          </ul>
        </div>

        <div className="text-sm text-gray-500">
          <p>Thank you for your understanding!</p>
        </div>
      </div>
    </div>
  );
};

export default DesktopOnlyMessage;