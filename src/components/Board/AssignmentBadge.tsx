import { AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { AssignmentModal } from '../Assignment/AssignmentModal';
import type { Resource } from '../../types';

interface AssignmentBadgeProps {
  resource: Resource;
  onComplete?: (score: number) => void;
}

export function AssignmentBadge({ resource, onComplete }: AssignmentBadgeProps) {
  const [showAssignment, setShowAssignment] = useState(false);

  if (!resource.hasPracticeAssignment) {
    return null;
  }

  const assignmentPending = !resource.assignmentCompleted;

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
        {resource.assignmentCompleted ? (
          <>
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              Score: {resource.latestAssignmentScore ?? 0}%
            </span>
          </>
        ) : (
          <>
            <AlertCircle size={14} className="text-orange-500" />
            <span className="text-orange-700 dark:text-orange-300 font-medium">
              Practice quiz available
            </span>
          </>
        )}

        {assignmentPending && (
          <button
            onClick={() => setShowAssignment(true)}
            className="ml-auto px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition"
          >
            Take Quiz
          </button>
        )}
      </div>

      {showAssignment && (
        <AssignmentModal
          resourceId={resource.id}
          onClose={() => setShowAssignment(false)}
          onComplete={(score) => {
            setShowAssignment(false);
            onComplete?.(score);
          }}
        />
      )}
    </>
  );
}
