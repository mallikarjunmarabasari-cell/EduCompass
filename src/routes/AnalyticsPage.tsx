import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsService } from '../services/api';

export function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [distribution, setDistribution] = useState<any>(null);
  const [completion, setCompletion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [summaryRes, distRes, complRes] = await Promise.all([
        analyticsService.getSummary(),
        analyticsService.getDistribution(),
        analyticsService.getCompletion(),
      ]);

      setSummary(summaryRes.data);
      setDistribution(distRes.data);
      setCompletion(complRes.data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const distributionData = distribution
    ? [
        { name: 'Video', value: distribution.Video },
        { name: 'Notes', value: distribution.Notes },
        { name: 'PDF', value: distribution.PDF },
        { name: 'Practice', value: distribution.Practice },
        { name: 'Reading', value: distribution.Reading },
      ].filter((d) => d.value > 0)
    : [];

  const completionData = completion
    ? [
        { name: 'Completed', value: completion.completed },
        { name: 'Pending', value: completion.pending },
      ]
    : [];

  const COLORS = ['#FBBF24', '#6B7280', '#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Learning Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your progress and performance</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Boards</p>
            <p className="text-4xl font-bold text-yellow-400">{summary.totalBoards}</p>
          </div>
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Resources</p>
            <p className="text-4xl font-bold text-yellow-400">{summary.totalResources}</p>
          </div>
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Completed</p>
            <p className="text-4xl font-bold text-green-400">{summary.completedResources}</p>
          </div>
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Average Score</p>
            <p className="text-4xl font-bold text-blue-400">{summary.averageScore}%</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Chart */}
        {completionData.length > 0 && (
          <div className="card-elevated p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Completion Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {completionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribution Chart */}
        {distributionData.length > 0 && (
          <div className="card-elevated p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData}>
                <Tooltip />
                <Bar dataKey="value" fill="#FBBF24" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="card-elevated p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Category Breakdown</h3>
        {distributionData.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-900 dark:text-white font-medium">{item.name}</span>
              <span className="text-yellow-400 font-bold">{item.value}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(item.value / Math.max(...distributionData.map((d) => d.value))) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
