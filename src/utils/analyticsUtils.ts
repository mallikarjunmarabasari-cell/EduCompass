import type { Resource, Board } from '../types';

export function calculateBoardCompletion(resources: Resource[]): number {
  if (resources.length === 0) return 0;
  const completedWithAssignment = resources.filter(
    (r) => r.status === 'completed' && r.assignmentCompleted
  ).length;
  return Math.round((completedWithAssignment / resources.length) * 100);
}

export function calculateBoardMastery(resources: Resource[]): number {
  const completed = resources.filter((r) => r.status === 'completed' && r.assignmentCompleted);
  if (completed.length === 0) return 0;
  const avgScore = completed.reduce((acc, r) => acc + (r.latestAssignmentScore || 0), 0) / completed.length;
  return Math.round(avgScore);
}

export function getCategoryStats(resources: Resource[]): Record<string, number> {
  const stats: Record<string, number> = {
    Video: 0,
    Notes: 0,
    PDF: 0,
    Practice: 0,
    Reading: 0,
  };

  resources.forEach((r) => {
    if (stats.hasOwnProperty(r.category)) {
      stats[r.category]++;
    }
  });

  return stats;
}

export function getCompletionStats(resources: Resource[]): { completed: number; pending: number } {
  const completed = resources.filter((r) => r.status === 'completed' && r.assignmentCompleted).length;
  const pending = resources.length - completed;
  return { completed, pending };
}
