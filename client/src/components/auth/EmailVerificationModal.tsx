import React from 'react';
import { X, Mail, ArrowDown, Globe } from 'lucide-react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResendEmail: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  onResendEmail
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black text-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="text-center space-y-6">
          {/* Header Text */}
          <div className="space-y-2">
            <h2 className="text-lg font-medium tracking-wide">
              AN EMAIL TO SIGN IN IS
            </h2>
            <h2 className="text-lg font-medium tracking-wide">
              ON ITS WAY.
            </h2>
          </div>

          {/* Resend Email Button */}
          <button
            onClick={onResendEmail}
            className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors cursor-pointer"
          >
            RESEND EMAIL
          </button>

          {/* Email Illustration */}
          <div className="py-6">
            <div className="border border-gray-600 rounded-lg p-6 space-y-4">
              {/* Email Header */}
              <div className="flex items-center space-x-2 text-sm">
                <Mail size={16} className="text-cyan-400" />
                <span className="text-cyan-400">TYPUS</span>
              </div>
              
              {/* Email List */}
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Mail size={14} className="text-gray-400" />
                    <div className="h-2 bg-gray-600 rounded flex-1"></div>
                  </div>
                ))}
              </div>
              
              {/* Email Content Area */}
              <div className="border border-gray-600 rounded h-20 bg-gray-900/50"></div>
            </div>
          </div>

          {/* Arrow Down */}
          <div className="flex justify-center">
            <ArrowDown size={32} className="text-white" />
          </div>

          {/* Browser Illustration */}
          <div className="py-4">
            <div className="border border-gray-600 rounded-lg p-4 space-y-3">
              {/* Browser Address Bar */}
              <div className="text-xs text-gray-400 text-left font-mono">
                APP.TYPUS.AI/LOGIN
              </div>
              
              {/* Browser Content */}
              <div className="flex justify-center py-10">
                <Globe size={56} className="text-cyan-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
