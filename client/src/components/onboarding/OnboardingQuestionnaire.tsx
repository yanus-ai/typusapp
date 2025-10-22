import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { OnboardingData } from './types';
import { questions } from './constants';
import TypusLogoBlack from "@/assets/images/typus_logo_black.png";

interface OnboardingQuestionnaireProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

const OnboardingQuestionnaire: React.FC<OnboardingQuestionnaireProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentStep];
  const progress = isFinished ? 100 : (currentStep / questions.length) * 100;

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear error when user provides an answer
    if (errors[questionId]) {
      setErrors(prev => ({
        ...prev,
        [questionId]: ''
      }));
    }
  };

  const validateCurrentStep = (): boolean => {
    const question = currentQuestion;
    
    if (question.type === 'contact') {
      // Special validation for contact fields
      const requiredFields = [
        'phoneNumber', 'companyName', 'streetAndNumber', 
        'city', 'postcode', 'state', 'country'
      ];
      const missingFields = requiredFields.filter(field => !answers[field as keyof OnboardingData]);
      
      if (question.required && missingFields.length > 0) {
        setErrors(prev => ({
          ...prev,
          [question.id]: 'All fields are required'
        }));
        return false;
      }
    } else {
      const answer = answers[question.id as keyof typeof answers];
      if (question.required && (!answer || (Array.isArray(answer) && answer.length === 0))) {
        setErrors(prev => ({
          ...prev,
          [question.id]: 'This question is required'
        }));
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (validateCurrentStep()) {
      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Set loading state and submit
        setIsSubmitting(true);
        try {
          setIsFinished(true);
          await onComplete(answers as OnboardingData);
        } catch (error) {
          console.error('Error completing onboarding:', error);
          setIsSubmitting(false);
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderQuestion = () => {
    const question = currentQuestion;
    const answer = answers[question.id as keyof typeof answers];

    switch (question.type) {
      case 'single':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  answer === option
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                  answer === option
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}>
                  {answer === option && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className="text-sm font-medium">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'text':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={4}
          />
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={answers.companyName || ''}
                onChange={(e) => handleAnswerChange('companyName', e.target.value)}
                placeholder="Enter your company name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={answers.phoneNumber || ''}
                onChange={(e) => handleAnswerChange('phoneNumber', e.target.value)}
                placeholder="Enter your phone number"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            
            {/* Address Fields */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Address Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street & Number
                  </label>
                  <input
                    type="text"
                    value={answers.streetAndNumber || ''}
                    onChange={(e) => handleAnswerChange('streetAndNumber', e.target.value)}
                    placeholder="Enter street and number"
                    autoComplete="address-line1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={answers.city || ''}
                    onChange={(e) => handleAnswerChange('city', e.target.value)}
                    placeholder="Enter city"
                    autoComplete="address-level2"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={answers.postcode || ''}
                    onChange={(e) => handleAnswerChange('postcode', e.target.value)}
                    placeholder="Enter postcode"
                    autoComplete="postal-code"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={answers.state || ''}
                    onChange={(e) => handleAnswerChange('state', e.target.value)}
                    placeholder="Enter state or province"
                    autoComplete="address-level1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={answers.country || ''}
                    onChange={(e) => handleAnswerChange('country', e.target.value)}
                    placeholder="Enter country"
                    autoComplete="country"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="flex w-full justify-center">
        <div className="mb-0">
          <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-10 w-auto p-2" />
          <h1 className="mt-2 text-center text-xl font-light font-source-serif tracking-[2.5px]">
            TYPUS.AI
          </h1>
          <p className="mt-2 text-center text-xs text-gray-600 font-medium">
            AI-Powered Architectural Visualization
          </p>
        </div>
      </div>

      <Card className="w-full max-w-2xl border-0 shadow-none">
        <CardContent className='px-0'>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome! Let's get to know you better
            </h1>
            <p className="text-gray-600">
              Help us personalize your experience by answering a few quick questions
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentStep + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {currentQuestion.question}
            </h2>
            {renderQuestion()}
            {errors[currentQuestion.id] && (
              <p className="text-red-500 text-sm mt-2">{errors[currentQuestion.id]}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center border-0 shadow-none"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-3">
              <Button
                onClick={handleNext}
                className="flex items-center text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {currentStep === questions.length - 1 ? 'Completing...' : 'Loading...'}
                  </>
                ) : (
                  <>
                    {currentStep === questions.length - 1 ? 'Complete' : 'Next'}
                    {currentStep === questions.length - 1 ? (
                      <CheckCircle className="w-4 h-4 ml-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 ml-2" />
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingQuestionnaire;

