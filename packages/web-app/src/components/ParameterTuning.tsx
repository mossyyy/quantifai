'use client';

import React, { useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useAIDetection } from '@/lib/hooks/useAIDetection';
import type { EnhancedChangeEvent, AIDetectionConfig } from '@ai-analyzer/core';

interface ParameterTuningProps {
    events: EnhancedChangeEvent[];
    currentConfig: AIDetectionConfig;
}

const ParameterTuning: React.FC<ParameterTuningProps> = ({ events, currentConfig }) => {
    const { setAiDetectionConfig } = useAppStore();
    const { updateConfig } = useAIDetection();
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Ensure bucketConfig exists with default values
    const safeConfig = {
        ...currentConfig,
        bucketConfig: currentConfig.bucketConfig || {
            intervalMinutes: 15,
            aggregationMethod: 'average' as const,
            minEventsPerBucket: 1
        }
    };

    // Debounced config update to prevent excessive re-analysis
    const debouncedUpdateConfig = useCallback((newConfig: AIDetectionConfig) => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            updateConfig(newConfig);
        }, 300); // 300ms debounce
    }, [updateConfig]);

    const handleWeightChange = (heuristic: keyof AIDetectionConfig['weights'], value: number) => {
        const currentWeights = { ...currentConfig.weights };
        const oldValue = currentWeights[heuristic];
        const difference = value - oldValue;

        // Get all other weight keys
        const otherKeys = Object.keys(currentWeights).filter(key => key !== heuristic) as Array<keyof AIDetectionConfig['weights']>;

        if (otherKeys.length === 0) {
            // Edge case: only one weight exists
            currentWeights[heuristic] = value;
        } else {
            // Calculate current sum of other weights
            const otherWeightsSum = otherKeys.reduce((sum, key) => sum + currentWeights[key], 0);

            if (otherWeightsSum === 0) {
                // If other weights are all zero, distribute evenly
                const remainingWeight = 1 - value;
                const weightPerOther = remainingWeight / otherKeys.length;
                otherKeys.forEach(key => {
                    currentWeights[key] = Math.max(0, weightPerOther);
                });
            } else {
                // Proportionally adjust other weights
                const remainingWeight = 1 - value;
                const scaleFactor = remainingWeight / otherWeightsSum;

                otherKeys.forEach(key => {
                    currentWeights[key] = Math.max(0, currentWeights[key] * scaleFactor);
                });
            }

            // Set the new value for the changed weight
            currentWeights[heuristic] = value;

            // Ensure total is exactly 1.0 by adjusting the largest other weight if needed
            const totalWeight = Object.values(currentWeights).reduce((sum, w) => sum + w, 0);
            if (Math.abs(totalWeight - 1) > 0.001) {
                const adjustment = 1 - totalWeight;
                const largestOtherKey = otherKeys.reduce((maxKey, key) =>
                    currentWeights[key] > currentWeights[maxKey] ? key : maxKey
                );
                currentWeights[largestOtherKey] = Math.max(0, currentWeights[largestOtherKey] + adjustment);
            }
        }

        const newConfig = {
            ...currentConfig,
            weights: currentWeights
        };
        setAiDetectionConfig(newConfig);
        debouncedUpdateConfig(newConfig);
    };

    const handleThresholdChange = (threshold: keyof AIDetectionConfig['thresholds'], value: number) => {
        const newConfig = {
            ...currentConfig,
            thresholds: {
                ...currentConfig.thresholds,
                [threshold]: value
            }
        };
        setAiDetectionConfig(newConfig);
        debouncedUpdateConfig(newConfig);
    };

    const handleClassificationChange = (classification: keyof AIDetectionConfig['classification'], value: number) => {
        const newConfig = {
            ...currentConfig,
            classification: {
                ...currentConfig.classification,
                [classification]: value
            }
        };
        setAiDetectionConfig(newConfig);
        debouncedUpdateConfig(newConfig);
    };

    const handleBucketConfigChange = (setting: keyof AIDetectionConfig['bucketConfig'], value: number | string) => {
        const newConfig = {
            ...currentConfig,
            bucketConfig: {
                ...safeConfig.bucketConfig,
                [setting]: value
            }
        };
        setAiDetectionConfig(newConfig);
        debouncedUpdateConfig(newConfig);
    };

    const resetToDefaults = () => {
        const defaultConfig: AIDetectionConfig = {
            weights: {
                bulkInsertionScore: 0.15,
                typingSpeedScore: 0.70,
                pastePatternScore: 0.05,
                externalToolScore: 0.05,
                contentPatternScore: 0.03,
                timingAnomalyScore: 0.02
            },
            thresholds: {
                bulkInsertionSize: 100,
                fastTypingSpeed: 300,
                pasteTimeThreshold: 100,
                longPauseThreshold: 5000,
                rapidSequenceThreshold: 100
            },
            classification: {
                humanThreshold: 0.3,
                aiAssistedThreshold: 0.7,
                aiGeneratedThreshold: 0.9
            },
            bucketConfig: {
                intervalMinutes: 15,
                aggregationMethod: 'average',
                minEventsPerBucket: 1
            }
        };
        setAiDetectionConfig(defaultConfig);
        updateConfig(defaultConfig);
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Parameter Tuning</h3>
                <button
                    onClick={resetToDefaults}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                    Reset to Defaults
                </button>
            </div>

            <div className="space-y-6">
                {/* Heuristic Weights */}
                <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Heuristic Weights</h4>
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                            <strong>Heuristic weights</strong> determine how much each detection method contributes to the final AI probability score.
                            Higher weights give more importance to that specific detection method. All weights automatically balance to sum to 1.0.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(currentConfig.weights).map(([key, value]) => {
                            const getFeatureDescription = (featureKey: string) => {
                                const descriptions: Record<string, string> = {
                                    bulkInsertionScore: "Detects large blocks of text inserted quickly, often indicating copy-paste or AI generation. Calculated based on content length and insertion speed.",
                                    typingSpeedScore: "Measures unusually fast typing speeds that exceed human capabilities. Calculated from characters per minute during active typing periods.",
                                    pastePatternScore: "Identifies patterns consistent with paste operations, including timing gaps and content structure. Detects clipboard-based content insertion.",
                                    externalToolScore: "Detects indicators of external tool usage such as formatting patterns, code structure, or metadata suggesting AI assistance.",
                                    contentPatternScore: "Analyzes content for patterns typical of AI-generated text, including repetitive structures and unnatural language flows.",
                                    timingAnomalyScore: "Identifies unusual timing patterns in coding behavior, such as inconsistent pauses or unnatural rhythm variations."
                                };
                                return descriptions[featureKey] || "Feature description not available.";
                            };

                            const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('Score', '');
                            const description = getFeatureDescription(key);

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <label className="text-sm font-medium text-gray-700">
                                                {displayName}
                                            </label>
                                            <div className="text-xs text-gray-500 mt-1 leading-tight">
                                                {description}
                                            </div>
                                        </div>
                                        <span className="text-sm text-gray-500 ml-2">{value.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={value}
                                        onChange={(e) => handleWeightChange(key as keyof AIDetectionConfig['weights'], parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Total weight: {Object.values(currentConfig.weights).reduce((sum, w) => sum + w, 0).toFixed(2)}
                        {Object.values(currentConfig.weights).reduce((sum, w) => sum + w, 0) !== 1 && (
                            <span className="text-orange-600 ml-2">⚠️ Weights should sum to 1.0</span>
                        )}
                    </div>
                </div>

                {/* Detection Thresholds */}
                <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Detection Thresholds</h4>
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                            <strong>Detection thresholds</strong> define the sensitivity levels for identifying suspicious coding patterns.
                            Lower values make detection more sensitive, while higher values require stronger evidence before flagging potential AI assistance.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Bulk Insertion Size</label>
                                <span className="text-sm text-gray-500">{currentConfig.thresholds.bulkInsertionSize} chars</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="500"
                                step="10"
                                value={currentConfig.thresholds.bulkInsertionSize}
                                onChange={(e) => handleThresholdChange('bulkInsertionSize', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Fast Typing Speed</label>
                                <span className="text-sm text-gray-500">{currentConfig.thresholds.fastTypingSpeed} CPM</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="1000"
                                step="50"
                                value={currentConfig.thresholds.fastTypingSpeed}
                                onChange={(e) => handleThresholdChange('fastTypingSpeed', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Paste Time Threshold</label>
                                <span className="text-sm text-gray-500">{currentConfig.thresholds.pasteTimeThreshold} ms</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="1000"
                                step="10"
                                value={currentConfig.thresholds.pasteTimeThreshold}
                                onChange={(e) => handleThresholdChange('pasteTimeThreshold', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Long Pause Threshold</label>
                                <span className="text-sm text-gray-500">{(currentConfig.thresholds.longPauseThreshold / 1000).toFixed(1)} s</span>
                            </div>
                            <input
                                type="range"
                                min="1000"
                                max="30000"
                                step="1000"
                                value={currentConfig.thresholds.longPauseThreshold}
                                onChange={(e) => handleThresholdChange('longPauseThreshold', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                    </div>
                </div>

                {/* Classification Thresholds */}
                <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Classification Thresholds</h4>
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                            <strong>Classification thresholds</strong> determine how AI probability scores are categorized into risk levels.
                            Scores below the human threshold are classified as human-written, between human and AI-assisted as mixed,
                            and above AI-generated threshold as likely AI-generated content.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Human Threshold</label>
                                <span className="text-sm text-gray-500">{(currentConfig.classification.humanThreshold * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={currentConfig.classification.humanThreshold}
                                onChange={(e) => handleClassificationChange('humanThreshold', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">AI Assisted Threshold</label>
                                <span className="text-sm text-gray-500">{(currentConfig.classification.aiAssistedThreshold * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={currentConfig.classification.aiAssistedThreshold}
                                onChange={(e) => handleClassificationChange('aiAssistedThreshold', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">AI Generated Threshold</label>
                                <span className="text-sm text-gray-500">{(currentConfig.classification.aiGeneratedThreshold * 100).toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={currentConfig.classification.aiGeneratedThreshold}
                                onChange={(e) => handleClassificationChange('aiGeneratedThreshold', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                    </div>
                </div>

                {/* Bucket Configuration */}
                <div>
                    <h4 className="text-md font-medium text-gray-800 mb-3">Timeline Bucket Configuration</h4>
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                            <strong>Bucket configuration</strong> controls how events are grouped for timeline analysis.
                            Smaller intervals provide more granular analysis but may have fewer events per bucket.
                            Larger intervals show broader patterns but may miss short-term AI usage spikes.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Bucket Interval</label>
                                <span className="text-sm text-gray-500">{safeConfig.bucketConfig.intervalMinutes} min</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="60"
                                step="1"
                                value={safeConfig.bucketConfig.intervalMinutes}
                                onChange={(e) => handleBucketConfigChange('intervalMinutes', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="text-xs text-gray-500">
                                Common values: 5min (detailed), 15min (balanced), 30min (overview)
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Min Events per Bucket</label>
                                <span className="text-sm text-gray-500">{safeConfig.bucketConfig.minEventsPerBucket}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={safeConfig.bucketConfig.minEventsPerBucket}
                                onChange={(e) => handleBucketConfigChange('minEventsPerBucket', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="text-xs text-gray-500">
                                Buckets with fewer events will be considered empty
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Aggregation Method</label>
                                <span className="text-sm text-gray-500">{safeConfig.bucketConfig.aggregationMethod}</span>
                            </div>
                            <select
                                value={safeConfig.bucketConfig.aggregationMethod}
                                onChange={(e) => handleBucketConfigChange('aggregationMethod', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="average">Average</option>
                                <option value="max">Maximum</option>
                                <option value="weighted">Weighted</option>
                            </select>
                            <div className="text-xs text-gray-500">
                                How to combine multiple AI scores within a bucket
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real-time Impact */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Real-time Impact</h4>
                    <p className="text-sm text-blue-700">
                        Changes to these parameters will immediately re-analyze the current dataset.
                        Watch the visualizations update as you adjust the settings to see how different
                        configurations affect the AI detection results.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ParameterTuning;
