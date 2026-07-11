import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, Zap, Target, X, Brain, BarChart3, Sparkles } from 'lucide-react';

export function HomePage() {
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);

  const features = [
    {
      icon: BookOpen,
      title: 'Organize Resources',
      description: 'Centralize all study materials - videos, notes, PDFs, and links in one place',
    },
    {
      icon: Zap,
      title: 'Enforce Learning',
      description: 'Complete MCQ assignments after each resource to ensure mastery',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Visual analytics showing completion rates, scores, and learning trends',
    },
    {
      icon: Target,
      title: 'Smart Recommendations',
      description: 'AI-powered suggestions on what to study next based on your performance',
    },
  ];

  const detailedFeatures = [
    {
      icon: BookOpen,
      title: 'Multi-Format Resource Management',
      description: 'Store videos, articles, PDFs, and links in organized boards by topic or course',
      details: ['Add YouTube videos with auto-thumbnail preview', 'Support for multiple resource types', 'Custom categories and organization', 'Rich metadata for easy discovery']
    },
    {
      icon: Zap,
      title: 'Enforced Learning with Assignments',
      description: 'Complete MCQ assignments after studying to ensure you understand the material',
      details: ['Custom MCQ quizzes per resource', 'Track assignment completion and scores', 'Instant feedback on answers', 'Strengthen weak areas']
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics & Progress Tracking',
      description: 'Visual dashboards showing your learning progress and performance metrics',
      details: ['Completion rate tracking', 'Score analysis by topic', 'Learning trends and patterns', 'Time spent on resources']
    },
    {
      icon: Sparkles,
      title: 'Full-Text Search & Smart Tagging',
      description: 'Powerful search across all resources with custom tagging for better organization',
      details: ['Real-time search across titles, descriptions, and content', 'Custom tag creation and management', 'Filter by category, status, and tags', 'Auto-generated tag suggestions']
    },
    {
      icon: Brain,
      title: 'AI-Powered Summaries & Notes',
      description: 'Automatically generate summaries, key points, and flashcards from any resource',
      details: ['Extract transcripts from YouTube videos', 'Auto-generate 5-sentence summaries', 'Extract key takeaways in bullet points', 'Create revision flashcards with Q&A pairs']
    },
    {
      icon: BarChart3,
      title: 'Kanban Board Management',
      description: 'Organize resources in To Do, In Progress, and Completed columns with drag-and-drop',
      details: ['Visual status management', 'Progress percentage tracking', 'Automatic resource movement', 'Real-time updates']
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              Master Your <span className="text-yellow-400">Learning</span> Journey
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              EduCompass is your personalized study companion. Organize resources, enforce learning through assignments,
              and track your mastery with advanced analytics.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/boards" className="btn-primary">
                Create Your First Board
              </Link>
              <button 
                onClick={() => setShowFeaturesModal(true)}
                className="btn-secondary"
              >
                Explore Features
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start organizing your study plan in under a minute.
            </p>
          </div>
          <div className="bg-gradient-to-br from-yellow-400/20 to-gray-900/20 rounded-xl h-80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 dark:text-gray-400">Your Learning Dashboard</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Powerful Features for <span className="text-yellow-400">Smart Learning</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="card-elevated p-6 space-y-4 hover:shadow-2xl transition">
                <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                  <Icon size={24} className="text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gradient-to-r from-gray-900 via-yellow-400/5 to-gray-900 rounded-xl p-12">
        <h2 className="text-4xl font-bold mb-12 text-gray-900 dark:text-white text-center">
          How It Works in <span className="text-yellow-400">4 Steps</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { num: '1', title: 'Create Board', desc: 'Set up a new study board for your course' },
            { num: '2', title: 'Add Resources', desc: 'Add videos, notes, PDFs, and practice links' },
            { num: '3', title: 'Complete Assignment', desc: 'Take MCQ quizzes to ensure understanding' },
            { num: '4', title: 'Track Progress', desc: 'View analytics and get recommendations' },
          ].map((step, idx) => (
            <div key={idx} className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-2xl mx-auto">
                {step.num}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-center space-y-6">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">Ready to Transform Your Learning?</h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Join thousands of students already using EduCompass to master their subjects with better organization,
          enforcement, and insights.
        </p>
        <Link to="/boards" className="inline-block btn-primary text-lg">
          Start Free Now
        </Link>
      </section>

      {/* Features Modal */}
      {showFeaturesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                EduCompass Features & Functionalities
              </h2>
              <button
                onClick={() => setShowFeaturesModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {detailedFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon size={28} className="text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {feature.description}
                        </p>
                        <ul className="space-y-2">
                          {feature.details.map((detail, detailIdx) => (
                            <li key={detailIdx} className="flex items-start gap-2">
                              <span className="text-yellow-400 font-bold mt-1">✓</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {idx < detailedFeatures.length - 1 && (
                      <div className="border-b border-gray-200 dark:border-gray-800"></div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex gap-4">
                <Link
                  to="/boards"
                  className="flex-1 btn-primary text-center"
                >
                  Get Started Now
                </Link>
                <button
                  onClick={() => setShowFeaturesModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

