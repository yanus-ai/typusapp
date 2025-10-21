import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface Question {
  id: string;
  type: 'single' | 'text' | 'contact';
  question: string;
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface OnboardingData {
  software: string;
  status: string;
  timeOnRenderings: string;
  moneySpentForOneImage: string;
  fullName: string;
  email: string;
}

const questions: Question[] = [
  {
    id: 'software',
    type: 'single',
    question: 'Which software do you use?',
    options: [
      'Revit',
      'Archicad',
      'Sketch',
      'Rhino',
      'Other'
    ],
    required: true
  },
  {
    id: 'status',
    type: 'single',
    question: 'Which status are you in?',
    options: [
      'Architectural Student',
      'Architectural Employee',
      'Self employed Architect',
      '3D Artist'
    ],
    required: true
  },
  {
    id: 'timeOnRenderings',
    type: 'single',
    question: 'How much time do you spend on renderings?',
    options: [
      'A few hours',
      '2 days',
      'more than 2 days'
    ],
    required: true
  },
  {
    id: 'moneySpentForOneImage',
    type: 'single',
    question: 'If you outsource it, how much money do you spend for one image?',
    options: [
      'under 500 USD',
      '500 - 1500 USD',
      'more than 1500 USD'
    ],
    required: true
  },
  {
    id: 'contactInfo',
    type: 'contact',
    question: 'What is your full name and email address?',
    required: true
  }
] as const;

interface OnboardingQuestionnaireProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

const OnboardingQuestionnaire: React.FC<OnboardingQuestionnaireProps> = ({
  onComplete,
  onSkip
}) => {
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
      if (question.required && (!answers.fullName || !answers.email)) {
        setErrors(prev => ({
          ...prev,
          [question.id]: 'Both full name and email are required'
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

  const handleSkip = () => {
    onSkip();
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
                    ? 'border-blue-500 bg-blue-50'
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
                    ? 'border-blue-500 bg-blue-500'
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
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={answers.fullName || ''}
                onChange={(e) => handleAnswerChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={answers.email || ''}
                onChange={(e) => handleAnswerChange('email', e.target.value)}
                placeholder="Enter your email address"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
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
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex space-x-3">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-500"
                disabled={isSubmitting}
              >
                Skip for now
              </Button>
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

