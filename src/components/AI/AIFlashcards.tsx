import { useState } from 'react';
import { ChevronDown, Layers, Loader } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}

interface AIFlashcardsProps {
  flashcards?: Flashcard[];
  isLoading?: boolean;
}

export function AIFlashcards({
  flashcards,
  isLoading = false,
}: AIFlashcardsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return null;
  }

  const current = flashcards[currentIndex];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-semibold text-blue-400 hover:text-blue-500 transition"
      >
        <div className="flex items-center gap-2">
          <Layers size={14} />
          Revision Flashcards ({flashcards.length})
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="space-y-3 bg-blue-400/5 dark:bg-blue-400/10 p-3 rounded">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Loader size={12} className="animate-spin" />
              Loading flashcards...
            </div>
          ) : (
            <>
              {/* Flashcard Display */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer h-24 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800 p-4 flex items-center justify-center text-center hover:shadow-lg transition perspective"
              >
                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                  {isFlipped ? (
                    <>
                      <p className="text-blue-400 text-xs font-semibold mb-1">Answer:</p>
                      <p>{current.answer}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-blue-400 text-xs font-semibold mb-1">Question:</p>
                      <p>{current.question}</p>
                    </>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    (Click to flip)
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentIndex === 0}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  Previous
                </button>

                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                  {currentIndex + 1} / {flashcards.length}
                </p>

                <button
                  onClick={() => {
                    setCurrentIndex(Math.min(flashcards.length - 1, currentIndex + 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentIndex === flashcards.length - 1}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>

              {/* Flashcard List Preview */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-semibold">
                  View All Flashcards
                </summary>
                <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                  {flashcards.map((card, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsFlipped(false);
                      }}
                    >
                      <p className="text-blue-400 font-semibold text-xs">Q: {card.question}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">A: {card.answer}</p>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
}
