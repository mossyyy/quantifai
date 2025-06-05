'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAIDetection } from '@/lib/hooks/useAIDetection';
import DataImport from '@/components/DataImport';
import EnhancedRadarWithTimeline from '@/components/EnhancedRadarWithTimeline';
import ParameterTuning from '@/components/ParameterTuning';
import { calculateHeuristicScores } from '@/lib/utils/calculations';

export default function Dashboard() {
  const {
    currentDataset,
    currentAnalysis,
    aiDetectionConfig,
    isLoading,
    error,
    clearError
  } = useAppStore();

  const { analyzeEvents } = useAIDetection();

  // Re-analyze when dataset or config changes
  useEffect(() => {
    if (currentDataset?.events) {
      analyzeEvents(currentDataset.events);
    }
  }, [currentDataset, aiDetectionConfig]);

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded-md hover:bg-red-200"
                  onClick={clearError}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <DataImport />

          {currentDataset && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Dataset</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Name:</span>
                  <p className="text-sm text-gray-900">{currentDataset.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Events:</span>
                  <p className="text-sm text-gray-900">{currentDataset.events.length}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Duration:</span>
                  <p className="text-sm text-gray-900">
                    {currentDataset.events.length > 1
                      ? `${((currentDataset.events[currentDataset.events.length - 1].timestamp - currentDataset.events[0].timestamp) / 1000).toFixed(1)}s`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Avg Typing Speed:</span>
                  <p className="text-sm text-gray-900">
                    {(() => {
                      const speeds = currentDataset.events.filter(e => e.instantTypingSpeed > 0);
                      return speeds.length > 0
                        ? `${(speeds.reduce((sum, e) => sum + e.instantTypingSpeed, 0) / speeds.length).toFixed(0)} CPM`
                        : 'N/A';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {currentDataset ? (
            <div className="space-y-8">
              {/* Enhanced Radar with Timeline */}
              <div className="bg-white rounded-lg shadow p-6">
                <EnhancedRadarWithTimeline
                  scores={calculateHeuristicScores(currentDataset.events)}
                  events={currentDataset.events}
                  config={aiDetectionConfig}
                  title={`AI Detection Analysis: ${currentDataset.name}`}
                />
              </div>

              {/* Parameter Tuning */}
              <div className="bg-white rounded-lg shadow p-6">
                <ParameterTuning
                  events={currentDataset.events}
                  currentConfig={aiDetectionConfig}
                />
              </div>

              {/* Analysis Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{currentDataset.events.length}</div>
                    <div className="text-sm text-gray-500">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentDataset.events.filter(e => e.burstDetected).length}
                    </div>
                    <div className="text-sm text-gray-500">Burst Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {currentDataset.events.filter(e => e.source === 'external').length}
                    </div>
                    <div className="text-sm text-gray-500">External Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentDataset.events.filter(e => e.isCodeBlock).length}
                    </div>
                    <div className="text-sm text-gray-500">Code Blocks</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 className="mt-4 text-xl font-medium text-gray-900">Welcome to AI Detection Parameter Tuner</h2>
                <p className="mt-2 text-gray-600">
                  Load a dataset from the sidebar to start visualizing and analyzing coding behavior patterns.
                </p>
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Features:</h3>
                  <ul className="text-left space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <span className="mr-2">📊</span>
                      Interactive timeline visualization of change events
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">🎯</span>
                      Heuristic score analysis with radar charts
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">📁</span>
                      Load sample datasets or upload your own JSONL files
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">⚡</span>
                      Real-time burst detection and pattern analysis
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">🔧</span>
                      Advanced parameter tuning capabilities
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
