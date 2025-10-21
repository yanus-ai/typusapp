import { Question } from "./types";

export const questions: Question[] = [
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
      question: 'Please provide your information',
      required: true
    }
  ] as const;