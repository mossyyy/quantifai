'use client';

import React from 'react';
import type { EnhancedChangeEvent, AIDetectionConfig, AIAttribution } from '@ai-analyzer/core';

interface DecisionTreeProps {
    config: AIDetectionConfig;
    events: EnhancedChangeEvent[];
    currentAnalysis: AIAttribution | null;
}

const DecisionTree: React.FC<DecisionTreeProps> = ({ config, events, currentAnalysis }) => {
    if (events.length === 0) {
        return (
            <div className="w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Decision Tree Analysis</h3>
                <div className="text-center text-gray-500 py-8">
                    <p>No events to analyze</p>
                </div>
            </div>
        );
    }

    // Calculate basic metrics for decision tree
    const totalEvents = events.length;
    const bulkEvents = events.filter(e => e.contentLength > config.thresholds.bulkInsertionSize);
    const fastTypingEvents = events.filter(e => e.instantTypingSpeed > config.thresholds.fastTypingSpeed);
    const externalEvents = events.filter(e => e.source === 'external');
    const burstEvents = events.filter(e => e.burstDetected);

    const bulkRatio = bulkEvents.length / totalEvents;
    const fastTypingRatio = fastTypingEvents.length / totalEvents;
    const externalRatio = externalEvents.length / totalEvents;
    const burstRatio = burstEvents.length / totalEvents;

    // Decision tree logic
    const getDecisionPath = () => {
        const steps = [];

        // Step 1: Check for external events
        if (externalRatio > 0.1) {
            steps.push({
                condition: `External events > 10% (${(externalRatio * 100).toFixed(1)}%)`,
                result: 'HIGH RISK',
                color: 'text-red-600',
                bgColor: 'bg-red-50 border-red-200'
            });
            return steps;
        }

        steps.push({
            condition: `External events ≤ 10% (${(externalRatio * 100).toFixed(1)}%)`,
            result: 'Continue analysis',
            color: 'text-green-600',
            bgColor: 'bg-green-50 border-green-200'
        });

        // Step 2: Check for bulk changes
        if (bulkRatio > 0.3) {
            steps.push({
                condition: `Bulk changes > 30% (${(bulkRatio * 100).toFixed(1)}%)`,
                result: 'MEDIUM-HIGH RISK',
                color: 'text-orange-600',
                bgColor: 'bg-orange-50 border-orange-200'
            });
            return steps;
        }

        steps.push({
            condition: `Bulk changes ≤ 30% (${(bulkRatio * 100).toFixed(1)}%)`,
            result: 'Continue analysis',
            color: 'text-green-600',
            bgColor: 'bg-green-50 border-green-200'
        });

        // Step 3: Check for fast typing
        if (fastTypingRatio > 0.2) {
            steps.push({
                condition: `Fast typing > 20% (${(fastTypingRatio * 100).toFixed(1)}%)`,
                result: 'MEDIUM RISK',
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50 border-yellow-200'
            });
            return steps;
        }

        steps.push({
            condition: `Fast typing ≤ 20% (${(fastTypingRatio * 100).toFixed(1)}%)`,
            result: 'Continue analysis',
            color: 'text-green-600',
            bgColor: 'bg-green-50 border-green-200'
        });

        // Step 4: Check for burst patterns
        if (burstRatio > 0.15) {
            steps.push({
                condition: `Burst events > 15% (${(burstRatio * 100).toFixed(1)}%)`,
                result: 'LOW-MEDIUM RISK',
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50 border-yellow-200'
            });
            return steps;
        }

        // Final step: Low risk
        steps.push({
            condition: `Burst events ≤ 15% (${(burstRatio * 100).toFixed(1)}%)`,
            result: 'LOW RISK',
            color: 'text-green-600',
            bgColor: 'bg-green-50 border-green-200'
        });

        return steps;
    };

    const decisionSteps = getDecisionPath();
    const finalResult = decisionSteps[decisionSteps.length - 1];

    return (
        <div className="w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Decision Tree Analysis</h3>

            {/* AI Detection Analysis */}
            {currentAnalysis && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-md font-medium text-blue-800 mb-3">AI Detection Engine Results</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                            <div className="font-medium text-gray-900">Classification</div>
                            <div className={`text-sm font-medium ${currentAnalysis.source === 'ai-generated' ? 'text-red-600' :
                                currentAnalysis.source === 'ai-assisted' ? 'text-orange-600' :
                                    currentAnalysis.source === 'mixed' ? 'text-yellow-600' :
                                        'text-green-600'
                                }`}>
                                {currentAnalysis.source.replace('-', ' ').toUpperCase()}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-900">Confidence</div>
                            <div className="text-sm text-gray-600">
                                {(currentAnalysis.confidence * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-900">AI Probability</div>
                            <div className="text-sm text-gray-600">
                                {(currentAnalysis.aiProbability * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-900">Evidence Items</div>
                            <div className="text-sm text-gray-600">
                                {currentAnalysis.evidence.bulkChanges.length +
                                    currentAnalysis.evidence.typingBursts.length +
                                    currentAnalysis.evidence.externalIndicators.length}
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-blue-700">
                        <strong>AI Detection Engine:</strong> Uses weighted heuristic analysis to calculate AI probability and classify content based on configurable thresholds.
                    </div>
                </div>
            )}

            {/* Decision Tree Steps */}
            <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800">Decision Path</h4>

                {decisionSteps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-4">
                        {/* Step Number */}
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                        </div>

                        {/* Step Content */}
                        <div className={`flex-1 p-3 rounded-lg border ${step.bgColor}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-700">{step.condition}</span>
                                <span className={`text-sm font-medium ${step.color}`}>
                                    {step.result}
                                </span>
                            </div>
                        </div>

                        {/* Arrow */}
                        {index < decisionSteps.length - 1 && (
                            <div className="flex-shrink-0 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Final Assessment */}
            <div className={`mt-6 p-4 rounded-lg border-2 ${finalResult.bgColor}`}>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Decision Tree Assessment</h4>
                <div className="flex justify-between items-center">
                    <span className="text-gray-700">Risk Level:</span>
                    <span className={`text-lg font-bold ${finalResult.color}`}>
                        {finalResult.result}
                    </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                    Based on the analysis of {totalEvents} events using rule-based decision tree logic.
                </div>
                <div className="mt-3 text-xs text-gray-700">
                    <strong>Decision Tree:</strong> Uses simple threshold-based rules to provide a quick risk assessment based on event patterns.
                </div>
            </div>

            {/* Assessment Comparison */}
            {currentAnalysis && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-md font-medium text-yellow-800 mb-2">Assessment Methods Comparison</h4>
                    <div className="text-sm text-yellow-700 space-y-2">
                        <div>
                            <strong>AI Detection Engine:</strong> Advanced weighted heuristic analysis that considers multiple factors simultaneously and provides probabilistic scoring.
                        </div>
                        <div>
                            <strong>Decision Tree:</strong> Simple rule-based assessment that follows a step-by-step logical path for quick risk evaluation.
                        </div>
                        <div className="mt-2 text-xs">
                            <em>Note: Different methodologies may produce different results. The AI Detection Engine provides more nuanced analysis, while the Decision Tree offers transparent, rule-based assessment.</em>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{bulkEvents.length}</div>
                    <div className="text-gray-600">Bulk Events</div>
                    <div className="text-xs text-gray-500">{(bulkRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{fastTypingEvents.length}</div>
                    <div className="text-gray-600">Fast Typing</div>
                    <div className="text-xs text-gray-500">{(fastTypingRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{externalEvents.length}</div>
                    <div className="text-gray-600">External</div>
                    <div className="text-xs text-gray-500">{(externalRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{burstEvents.length}</div>
                    <div className="text-gray-600">Burst</div>
                    <div className="text-xs text-gray-500">{(burstRatio * 100).toFixed(1)}%</div>
                </div>
            </div>
        </div>
    );
};

export default DecisionTree;
