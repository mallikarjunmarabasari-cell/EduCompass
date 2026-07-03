import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [distribution, setDistribution] = useState<any>(null);
  const [completion, setCompletion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const { user, loading: authLoading } = useAuth();

  const analyticsCacheKey = user
    ? `educompass_analytics_overview_v1_${user.id}`
    : 'educompass_analytics_overview_v1';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!authLoading && user) {
      loadAnalytics();
    }
  }, [authLoading, user]);

  const loadAnalytics = async () => {
    try {
      setError(null);
      setIsCached(false);
      setLoading(true);

      const cached = sessionStorage.getItem(analyticsCacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setSummary(parsed.summary);
            setDistribution(parsed.distribution);
            setCompletion(parsed.completion);
            setLastUpdated(new Date(parsed.timestamp).toLocaleString());
            setIsCached(true);
            setLoading(false);
            return;
          }
        } catch (cacheError) {
          console.warn('Invalid analytics cache, ignoring:', cacheError);
        }
      }

      const timeoutId = window.setTimeout(() => {
        setError('Analytics are taking too long to load. Please refresh the page.');
        setLoading(false);
      }, 15000);

      const overviewRes = await analyticsService.getOverview();
      window.clearTimeout(timeoutId);

      const newSummary = {
        totalBoards: overviewRes.data.totalBoards,
        totalResources: overviewRes.data.totalResources,
        completedResources: overviewRes.data.completedResources,
        averageScore: overviewRes.data.averageScore,
        averageProgress: overviewRes.data.averageProgress,
        quizzesCompleted: overviewRes.data.quizzesCompleted,
        assignmentCompletionRate: overviewRes.data.assignmentCompletionRate,
      };

      setSummary(newSummary);
      setDistribution(overviewRes.data.distribution);
      setCompletion(overviewRes.data.completion);
      setLastUpdated(new Date().toLocaleString());

      sessionStorage.setItem(
        analyticsCacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          summary: newSummary,
          distribution: overviewRes.data.distribution,
          completion: overviewRes.data.completion,
        }),
      );
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(
        err?.response?.data?.error || err?.message || 'Failed to load analytics. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">Please sign in to view analytics.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-semibold">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-yellow-400 text-black rounded font-semibold hover:bg-yellow-500 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const distributionData = distribution
    ? [
        { name: 'Video', value: distribution.Video || 0 },
        { name: 'Notes', value: distribution.Notes || 0 },
        { name: 'PDF', value: distribution.PDF || 0 },
        { name: 'Practice', value: distribution.Practice || 0 },
        { name: 'Reading', value: distribution.Reading || 0 },
        { name: 'Code', value: distribution.Code || 0 },
        { name: 'Text', value: distribution.Text || 0 },
        { name: 'Archive', value: distribution.Archive || 0 },
      ]
    : [];

  const visibleDistributionData = distributionData.filter((d) => d.value > 0);

  const completionData = completion
    ? [
        { name: 'Completed', value: completion.completed },
        { name: 'Pending', value: completion.pending },
      ]
    : [];

  const maxDistributionValue =
    distributionData.length > 0 ? Math.max(...distributionData.map((d) => d.value)) : 1;

  const COLORS: Record<string, string> = {
    Video: '#FBBF24',
    Notes: '#60A5FA',
    PDF: '#34D399',
    Practice: '#F97316',
    Reading: '#A78BFA',
    Code: '#818CF8',
    Text: '#94A3B8',
    Archive: '#F59E0B',
  };

  const completionColors = ['#10B981', '#6B7280'];

  const chartBars = visibleDistributionData.length > 0 ? visibleDistributionData : distributionData;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Learning Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your progress and performance</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated} {isCached ? '(cached)' : ''}
            </p>
          )}
          <button
            onClick={loadAnalytics}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Refresh
          </button>
        </div>
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
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Completion Rate</p>
            <p className="text-4xl font-bold text-green-400">
              {completion?.total > 0 ? `${Math.round((completion.completed / completion.total) * 100)}%` : '0%'}
            </p>
          </div>
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Average Score</p>
            <p className="text-4xl font-bold text-blue-400">{summary.averageScore}%</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Average Progress</p>
            <p className="text-3xl font-bold text-indigo-400">{summary.averageProgress}%</p>
          </div>
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Quizzes Completed</p>
            <p className="text-3xl font-bold text-emerald-400">{summary.quizzesCompleted}</p>
          </div>
          <div className="card-elevated p-6 space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Assignment Completion</p>
            <p className="text-3xl font-bold text-pink-400">{summary.assignmentCompletionRate}%</p>
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
                    <Cell key={`cell-${index}`} fill={completionColors[index % completionColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribution Chart */}
        <div className="card-elevated p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
          {visibleDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartBars}
                margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#D1D5DB', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#D1D5DB', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                  formatter={(value) => [value, 'Count']}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={32}>
                  {chartBars.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || '#FBBF24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-300">
              No category distribution data available yet.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="card-elevated p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Category Breakdown</h3>
        {distributionData.length > 0 ? (
          distributionData.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[item.name] || '#FBBF24' }}
                  />
                  <span className="text-gray-900 dark:text-white font-medium">{item.name}</span>
                </div>
                <span className="text-yellow-400 font-bold">{item.value}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${maxDistributionValue > 0 ? (item.value / maxDistributionValue) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-300">
            No category breakdown data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
