
import React from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
  showCorrect?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  selectedAnswer, 
  onAnswerChange,
  showCorrect = false
}) => {
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-6">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 min-h-[400px]">
        <h3 className="text-2xl font-bold text-gray-900 mb-10 leading-snug">
          {question.question}
        </h3>
        
        <div className="space-y-4">
          {question.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const letter = letters[idx];
            
            return (
              <button
                key={idx}
                onClick={() => !showCorrect && onAnswerChange(option)}
                disabled={showCorrect}
                className={`w-full group relative flex items-center p-5 rounded-xl border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' 
                    : 'border-gray-100 hover:border-blue-200 bg-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                
                <span className={`text-lg font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                  {letter}. {option}
                </span>

                {isSelected && (
                  <span className="absolute right-6 text-[10px] font-black text-blue-500 tracking-widest uppercase">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!showCorrect && (
        <div className="bg-[#eff6ff] p-6 rounded-2xl border border-[#dbeafe] flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fas fa-sparkles text-white text-sm"></i>
          </div>
          <div>
            <h4 className="text-blue-700 font-bold text-sm mb-1">AI Hint (Available)</h4>
            <p className="text-gray-600 text-sm leading-relaxed mb-2">
              {question.hint}
            </p>
            <button className="text-blue-600 text-xs font-bold underline hover:text-blue-800 transition-colors">
              Reveal detailed steps
            </button>
          </div>
        </div>
      )}

      {showCorrect && (
        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-500 mt-1"></i>
            <div>
              <p className="font-bold text-gray-900 mb-1">Explanation</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {question.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
