
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER'
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
}

export interface Quiz {
  title: string;
  subtitle: string;
  questions: Question[];
  metadata: {
    topic: string;
    difficulty: string;
    coveragePercentage: number; // Percentage of document covered by this specific quiz
    topicsCovered: string[];   // List of specific concepts tested
  };
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  answers: Record<string, string>;
  isCompleted: boolean;
}
