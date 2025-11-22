import { ResourceCard } from './ResourceCard';
import type { Resource } from '../../types';

interface ResourceColumnProps {
  title: string;
  resources: Resource[];
  columnStatus: 'todo' | 'in-progress' | 'completed';
  onStatusChange: (id: string, status: Resource['status']) => void;
  onProgressChange: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Resource>) => void;
  isReadOnly?: boolean;
}

export function ResourceColumn({
  title,
  resources,
  columnStatus,
  onStatusChange,
  onProgressChange,
  onDelete,
  onUpdate,
  isReadOnly = false,
}: ResourceColumnProps) {
  const getColumnColor = () => {
    switch (columnStatus) {
      case 'todo':
        return 'border-gray-300 dark:border-gray-700';
      case 'in-progress':
        return 'border-yellow-400 dark:border-yellow-400';
      case 'completed':
        return 'border-green-400 dark:border-green-400';
      default:
        return '';
    }
  };

  return (
    <div className={`bg-gray-100 dark:bg-gray-900 rounded-lg p-4 border-l-4 ${getColumnColor()}`}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{resources.length} items</p>
      </div>

      <div className="space-y-3">
        {resources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-500 text-sm">No resources yet</p>
          </div>
        ) : (
          resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onStatusChange={onStatusChange}
              onProgressChange={onProgressChange}
              onDelete={onDelete}
              onUpdate={onUpdate}
              isReadOnly={isReadOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}
