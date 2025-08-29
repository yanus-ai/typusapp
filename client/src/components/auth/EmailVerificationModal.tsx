import React from 'react';
import { X, Mail, ArrowDown, Globe } from 'lucide-react';
import EmailVerificationSvg from '@/assets/images/signin1_typus.png';
import EmailVerificationSvg2 from '@/assets/images/signin2_typus.png';

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
      <div className="relative bg-black text-white rounded-2xl px-8 py-20 max-w-sm w-full mx-4 shadow-2xl">
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
          <img 
            src={EmailVerificationSvg} 
            alt="Email Sent Illustration" 
            className="w-32 mx-auto mt-4" 
          />

          {/* Arrow Down */}
          <div className="flex justify-center">
            <ArrowDown size={32} className="text-white" />
          </div>

          {/* Browser Illustration */}
          <img 
            src={EmailVerificationSvg2} 
            alt="Email Sent Illustration" 
            className="w-48 mx-auto" 
          />
        </div>
      </div>
    </div>
  );
};
