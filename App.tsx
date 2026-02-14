
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Quiz, QuizResult } from './types';
import { generateQuizFromPDF } from './services/geminiService';
import { QuestionCard } from './components/QuestionCard';

const QUIZ_DURATION = 15 * 60; // 15 minutes

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [totalCoverage, setTotalCoverage] = useState(0);
  const [allTopicsCovered, setAllTopicsCovered] = useState<string[]>([]);
  const timerRef = useRef<number | null>(null);

  const finishQuiz = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setQuiz(q => {
      if (!q) return null;
      let correct = 0;
      q.questions.forEach(item => {
        if (userAnswers[item.id]?.toLowerCase().trim() === item.correctAnswer.toLowerCase().trim()) {
          correct++;
        }
      });
      
      // Calculate new mastery metrics
      setTotalCoverage(prev => Math.min(100, prev + q.metadata.coveragePercentage));
      setAllTopicsCovered(prev => [...new Set([...prev, ...q.metadata.topicsCovered])]);
      
      setResult({
        score: correct,
        totalQuestions: q.questions.length,
        answers: userAnswers,
        isCompleted: true
      });
      return q;
    });
  }, [userAnswers]);

  useEffect(() => {
    if (quiz && !result && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quiz, result, finishQuiz, timeLeft]);

  const handleStart = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const genQuiz = await generateQuizFromPDF(base64, 40, allTopicsCovered);
          setQuiz(genQuiz);
          setResult(null);
          setCurrentIdx(0);
          setUserAnswers({});
          setFlagged(new Set());
          setTimeLeft(QUIZ_DURATION);
          setLoading(false);
        } catch (err: any) {
          setError(err.message || 'Generation failed');
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('File error');
      setLoading(false);
    }
  };

  const toggleFlag = () => {
    if (!quiz) return;
    const id = quiz.questions[currentIdx].id;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAll = () => {
    setFile(null); setQuiz(null); setResult(null); setCurrentIdx(0); setUserAnswers({}); setFlagged(new Set()); setTimeLeft(QUIZ_DURATION);
    setTotalCoverage(0); setAllTopicsCovered([]);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return { h: h.toString().padStart(2, '0'), m: m.toString().padStart(2, '0'), s: sec.toString().padStart(2, '0') };
  };

  if (!quiz) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center rotate-45 shadow-blue-200 shadow-xl">
          <i className="fas fa-layer-group text-white text-3xl -rotate-45"></i>
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Complete Mastery</h1>
        <p className="text-gray-500 mb-10">Generate sequential quizzes to cover your entire PDF material from start to finish.</p>
        
        <label className="block mb-8 group cursor-pointer">
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 group-hover:border-blue-400 transition-all bg-gray-50/50">
            <input type="file" className="hidden" accept=".pdf" onChange={e => e.target.files && setFile(e.target.files[0])} />
            <i className="fas fa-file-pdf text-3xl text-gray-300 mb-3 group-hover:text-blue-500 transition-colors"></i>
            <p className="text-sm font-bold text-gray-500 tracking-tight">{file ? file.name : 'Choose study document'}</p>
          </div>
        </label>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4">{error}</div>}
        
        <button 
          onClick={handleStart} 
          disabled={!file || loading}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-300 transition-all active:scale-95"
        >
          {loading ? (
             <div className="flex items-center justify-center gap-2">
               <i className="fas fa-spinner animate-spin"></i> Analyzing...
             </div>
          ) : 'Start Complete Revision'}
        </button>
      </div>
    </div>
  );

  if (result) return (
    <div className="min-h-screen bg-white">
       <nav className="h-20 border-b flex items-center px-10 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><i className="fas fa-check text-white text-[10px]"></i></div>
            <h1 className="font-black text-xl tracking-tight">QUIZ SUMMARY</h1>
          </div>
          <button onClick={resetAll} className="font-bold text-gray-400 hover:text-red-500 text-sm">EXIT EXAM</button>
       </nav>

       <div className="max-w-4xl mx-auto py-20 px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 items-center">
            <div className="text-center lg:text-left">
              <span className="text-blue-600 font-black text-sm uppercase tracking-widest mb-2 block">Performance</span>
              <div className="text-9xl font-black text-gray-900 leading-none mb-4">
                {Math.round((result.score / result.totalQuestions) * 100)}<span className="text-4xl text-gray-300">%</span>
              </div>
              <p className="text-xl font-bold text-gray-500">{result.score} of {result.totalQuestions} correct</p>
            </div>

            <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <i className="fas fa-graduation-cap text-blue-500"></i>
                Total Material Mastery
              </h3>
              
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-2xl font-black text-gray-900">{totalCoverage}%</span>
                  <span className="text-xs font-bold text-gray-400">PDF COVERAGE</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${totalCoverage}%` }}></div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase">Newly Covered Topics:</p>
                <div className="flex flex-wrap gap-2">
                  {quiz.metadata.topicsCovered.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-black text-gray-700 shadow-xs">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center justify-center mb-20">
             {totalCoverage < 100 ? (
               <button 
                 onClick={handleStart}
                 disabled={loading}
                 className="w-full sm:w-auto bg-blue-600 text-white px-16 py-6 rounded-3xl font-black text-xl hover:bg-blue-700 transition-all shadow-2xl active:scale-95 flex items-center gap-4"
               >
                 {loading ? 'Preparing Next Portion...' : 'Generate Next Portion'}
                 <i className="fas fa-chevron-right"></i>
               </button>
             ) : (
               <div className="bg-green-50 text-green-700 px-10 py-6 rounded-3xl border border-green-200 text-center">
                  <i className="fas fa-trophy text-3xl mb-3"></i>
                  <h3 className="text-2xl font-black">100% Mastery Complete!</h3>
                  <p className="font-bold opacity-80">You've covered the entire document. Ready for the final exam?</p>
               </div>
             )}
             <p className="text-sm font-bold text-gray-400">Targeting remaining portions of the document...</p>
          </div>

          <div className="space-y-8 border-t pt-20">
            <h2 className="text-2xl font-black text-gray-900 mb-10">Review Questions</h2>
            {quiz.questions.map((q, i) => (
              <div key={q.id}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-black text-gray-400">Q{i + 1}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${userAnswers[q.id] === q.correctAnswer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {userAnswers[q.id] === q.correctAnswer ? 'Passed' : 'Missed'}
                  </span>
                </div>
                <QuestionCard question={q} selectedAnswer={userAnswers[q.id] || ''} onAnswerChange={() => {}} showCorrect />
              </div>
            ))}
          </div>
       </div>
    </div>
  );

  const t = formatTime(timeLeft);
  const completion = Math.round(((Object.keys(userAnswers).length) / quiz.questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <header className="h-[72px] bg-white border-b px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <i className="fas fa-dna text-white text-xs"></i>
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">{quiz.title}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mastery: {totalCoverage}%</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <span className="text-[11px] font-bold text-indigo-700 uppercase">Live Exam Tracking</span>
          </div>
          <button onClick={resetAll} className="bg-gray-100 hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <i className="fas fa-times"></i> Quit
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 flex justify-between items-end">
               <div>
                  <h2 className="text-blue-600 font-black text-sm mb-2">Progress • {currentIdx + 1} / {quiz.questions.length}</h2>
                  <div className="w-[800px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${((currentIdx + 1)/quiz.questions.length)*100}%` }}></div>
                  </div>
               </div>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{completion}% COMPLETED</span>
            </div>

            <QuestionCard 
              question={quiz.questions[currentIdx]} 
              selectedAnswer={userAnswers[quiz.questions[currentIdx].id] || ''} 
              onAnswerChange={(ans) => setUserAnswers(prev => ({...prev, [quiz.questions[currentIdx].id]: ans}))}
            />
          </div>
        </main>

        <aside className="w-[360px] bg-white border-l overflow-y-auto p-10 flex flex-col gap-10">
          <section>
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Clock</h3>
               <i className="fas fa-hourglass-half text-blue-500 text-sm"></i>
            </div>
            <div className="flex gap-2">
               {[ {v: t.h, l: 'HR'}, {v: t.m, l: 'MIN'}, {v: t.s, l: 'SEC'} ].map((item, i) => (
                 <div key={i} className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                    <div className="text-2xl font-black text-gray-900 tabular-nums">{item.v}</div>
                    <div className="text-[8px] font-black text-gray-400 mt-1">{item.l}</div>
                 </div>
               ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Question Map</h3>
               <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
               </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
               {quiz.questions.map((q, i) => {
                 const isFlagged = flagged.has(q.id);
                 const isAnswered = !!userAnswers[q.id];
                 const isCurrent = currentIdx === i;
                 return (
                   <button 
                     key={i} 
                     onClick={() => setCurrentIdx(i)}
                     className={`h-11 rounded-xl text-xs font-black transition-all relative ${
                       isCurrent ? 'bg-white border-2 border-blue-500 text-blue-600 shadow-md ring-4 ring-blue-50' :
                       isAnswered ? 'bg-blue-600 text-white' :
                       'bg-gray-100 text-gray-400 hover:bg-gray-200'
                     }`}
                   >
                     {i + 1}
                     {isFlagged && <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border border-white"></div>}
                   </button>
                 );
               })}
            </div>
            <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
               <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter mb-1">Session Goal</p>
               <p className="text-xs text-blue-700 leading-relaxed font-medium">Cover the remaining {100 - totalCoverage}% of the material today.</p>
            </div>
          </section>

          <div className="mt-auto">
             <button 
               onClick={finishQuiz}
               className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95"
             >
               Submit Attempt
             </button>
          </div>
        </aside>
      </div>

      <footer className="h-24 bg-white border-t px-12 flex items-center justify-between sticky bottom-0 z-50">
        <button 
          onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
          disabled={currentIdx === 0}
          className="px-8 py-4 rounded-2xl font-bold border-2 border-gray-100 text-gray-500 flex items-center gap-3 hover:bg-gray-50 disabled:opacity-20 transition-all"
        >
          <i className="fas fa-chevron-left"></i> Previous
        </button>

        <button 
          onClick={toggleFlag}
          className={`px-8 py-4 rounded-2xl font-bold border-2 transition-all flex items-center gap-3 ${
            flagged.has(quiz.questions[currentIdx].id) 
              ? 'border-orange-500 bg-orange-50 text-orange-600' 
              : 'border-gray-100 bg-white text-gray-400 hover:border-orange-200'
          }`}
        >
          <i className="fas fa-flag"></i> Flag Question
        </button>

        <button 
          onClick={() => {
            if (currentIdx < quiz.questions.length - 1) setCurrentIdx(p => p + 1);
            else finishQuiz();
          }}
          className="px-10 py-4 rounded-2xl bg-blue-600 text-white font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl active:scale-95"
        >
          {currentIdx === quiz.questions.length - 1 ? 'Complete Attempt' : 'Next Question'} 
          <i className="fas fa-chevron-right"></i>
        </button>
      </footer>
    </div>
  );
};

export default App;
