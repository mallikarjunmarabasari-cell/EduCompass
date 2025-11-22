import { AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { useState } from 'react';
import { AssignmentModal } from '../Assignment/AssignmentModal';
import type { Resource } from '../../types';

interface AssignmentBadgeProps {
  resource: Resource;
}

export function AssignmentBadge({ resource }: AssignmentBadgeProps) {
  const [showAssignment, setShowAssignment] = useState(false);

  if (!resource.hasPracticeAssignment) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
        {!resource.assignmentCompleted && resource.status === 'completed' && (
          <>
            <AlertCircle size={14} className="text-orange-500" />
            <span className="text-orange-700 dark:text-orange-300 font-medium">Assignment pending</span>
          </>
        )}
        {resource.assignmentCompleted && (
          <>
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              Score: {resource.latestAssignmentScore}%
            </span>
          </>
        )}
        {!resource.assignmentCompleted && resource.status !== 'completed' && (
          <>
            <Lock size={14} className="text-blue-500" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">Assignment locked</span>
          </>
        )}

        {resource.status === 'completed' && !resource.assignmentCompleted && (
          <button
            onClick={() => setShowAssignment(true)}
            className="ml-auto px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition"
          >
            Take Now
          </button>
        )}
      </div>

      {showAssignment && (
        <AssignmentModal
          resourceId={resource.id}
          onClose={() => setShowAssignment(false)}
          onComplete={() => {
            setShowAssignment(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
