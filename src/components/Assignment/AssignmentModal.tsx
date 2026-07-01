import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { assignmentService } from '../../services/api';
import type { Assignment } from '../../types';

interface AssignmentModalProps {
  resourceId: string;
  onClose: () => void;
  onComplete: (score: number) => void;
}

export function AssignmentModal({ resourceId, onClose, onComplete }: AssignmentModalProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);

  useEffect(() => {
    loadAssignment();
    window.addEventListener('blur', handleTabSwitch);
    return () => window.removeEventListener('blur', handleTabSwitch);
  }, []);

  const loadAssignment = async () => {
    try {
      const res = await assignmentService.getByResource(resourceId);
      if (res.data) {
        setAssignment(res.data);
        setAnswers(new Array(res.data.questions.length).fill(-1));
      }
    } catch (err) {
      console.error('Error loading assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = () => {
    if (!submitted) {
      setTabSwitchWarning(true);
      setTimeout(() => setTabSwitchWarning(false), 3000);
    }
  };

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.includes(-1)) {
      alert('Please answer all questions before submitting');
      return;
    }

    try {
      const res = await assignmentService.submit(resourceId, answers);
      setScore(res.data.scorePercent);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('Error submitting assignment');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No assignment found for this resource</p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full space-y-6 p-8 text-center">
          <div className="text-6xl mb-4">
            {score! >= 70 ? '🎉' : score! >= 50 ? '👍' : '📚'}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {score}%
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {score! >= 70
              ? 'Excellent work! You have mastered this topic.'
              : score! >= 50
                ? 'Good effort! Review the material and try again.'
                : 'Keep practicing! You will improve with more study.'}
          </p>
          <button
            onClick={() => onComplete(score ?? 0)}
            className="w-full btn-primary"
          >
            Complete & Continue
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = assignment.questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {tabSwitchWarning && (
        <div className="fixed top-4 left-4 right-4 bg-orange-500 text-white p-4 rounded-lg flex items-center gap-2 z-[51]">
          <AlertCircle size={20} />
          <span>Please stay on this tab during the assignment.</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{assignment.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Question {currentQuestionIndex + 1} of {assignment.questions.length}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentQuestionIndex + 1) / assignment.questions.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {currentQuestion.text}
            </h3>

            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    answers[currentQuestionIndex] === idx
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-300 dark:border-gray-700 hover:border-yellow-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={idx}
                    checked={answers[currentQuestionIndex] === idx}
                    onChange={() => handleAnswerChange(currentQuestionIndex, idx)}
                    className="w-4 h-4 accent-yellow-400"
                  />
                  <span className="ml-4 text-gray-900 dark:text-white">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pb-6">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium disabled:opacity-50"
            >
              Previous
            </button>

            {currentQuestionIndex === assignment.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={answers.includes(-1)}
                className="flex-1 py-2 px-4 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition font-medium disabled:opacity-50"
              >
                Submit Assignment
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="flex-1 py-2 px-4 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition font-medium"
              >
                Next
              </button>
            )}
          </div>

          {/* Question Indicators */}
          <div className="pb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick jump to question:</div>
            <div className="flex flex-wrap gap-2">
              {assignment.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-10 h-10 rounded-lg font-semibold transition ${
                    idx === currentQuestionIndex
                      ? 'bg-yellow-400 text-black'
                      : answers[idx] !== -1
                        ? 'bg-green-400 text-black'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
