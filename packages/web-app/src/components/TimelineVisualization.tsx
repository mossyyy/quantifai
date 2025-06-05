'use client';

import React, { useMemo } from 'react';
import type { EnhancedChangeEvent, AIDetectionConfig, TimeBucket } from '@ai-analyzer/core';
import { useAIDetection } from '@/lib/hooks/useAIDetection';

interface TimelineVisualizationProps {
    events: EnhancedChangeEvent[];
    title: string;
    config: AIDetectionConfig;
}

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ events, title, config }) => {
    const { analyzeBuckets } = useAIDetection();

    // Create buckets from events
    const buckets = useMemo(() => {
        if (events.length === 0) return [];
        return analyzeBuckets(events, config.bucketConfig);
    }, [events, config.bucketConfig, analyzeBuckets]);
    if (events.length === 0 || buckets.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-gray-500">
                <p>No events to display</p>
            </div>
        );
    }

    const startTime = buckets[0].startTime;
    const endTime = buckets[buckets.length - 1].endTime;
    const duration = endTime - startTime;

    // Y-axis values for AI probability (0 to 1)
    const yAxisTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

    // Generate time labels for X-axis based on bucket intervals
    const generateTimeLabels = () => {
        const labels = [];
        const labelCount = Math.min(6, buckets.length);
        for (let i = 0; i < labelCount; i++) {
            const bucketIndex = Math.floor((i / (labelCount - 1)) * (buckets.length - 1));
            const bucket = buckets[bucketIndex];
            const date = new Date(bucket.startTime);
            labels.push({
                position: (i / (labelCount - 1)) * 100,
                label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fullDate: date.toLocaleString()
            });
        }
        return labels;
    };

    const timeLabels = generateTimeLabels();

    // Helper function to get color based on AI probability
    const getColorForProbability = (probability: number) => {
        if (probability < config.classification.humanThreshold) {
            return 'bg-green-500'; // Human
        } else if (probability < config.classification.aiAssistedThreshold) {
            return 'bg-yellow-500'; // AI-assisted
        } else if (probability < config.classification.aiGeneratedThreshold) {
            return 'bg-orange-500'; // AI-generated
        } else {
            return 'bg-red-500'; // High AI probability
        }
    };

    // Filter out empty buckets for rendering
    const activeBuckets = buckets.filter(bucket => !bucket.isEmpty);

    return (
        <div className="w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

            <div className="relative bg-gray-50 rounded-lg p-4 overflow-x-auto" style={{ height: '200px' }}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-600">
                    <div className="text-right pr-2">AI Probability</div>
                    {yAxisTicks.slice().reverse().map((tick, index) => (
                        <div key={index} className="text-right pr-2">{tick.toFixed(1)}</div>
                    ))}
                </div>

                {/* Chart area */}
                <div className="relative ml-16 mr-4" style={{ height: '140px' }}>
                    {/* Y-axis grid lines */}
                    {yAxisTicks.map((tick, index) => (
                        <div
                            key={index}
                            className="absolute left-0 right-0 border-t border-gray-200"
                            style={{ bottom: `${(tick) * 100}%` }}
                        ></div>
                    ))}

                    {/* X-axis */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400"></div>

                    {/* Bucket Data Points */}
                    {activeBuckets.map((bucket, index) => {
                        const xPosition = duration > 0 ? ((bucket.startTime - startTime) / duration) * 100 : 0;
                        const yPosition = (bucket.aiProbability || 0) * 100;
                        const colorClass = getColorForProbability(bucket.aiProbability || 0);

                        return (
                            <div
                                key={`bucket-${bucket.startTime}`}
                                className="absolute transform -translate-x-1/2"
                                style={{
                                    left: `${xPosition}%`,
                                    bottom: `${yPosition}%`
                                }}
                                title={`AI Probability: ${((bucket.aiProbability || 0) * 100).toFixed(1)}% | Events: ${bucket.eventCount} | Time: ${new Date(bucket.startTime).toLocaleString()}`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${colorClass}`}
                                ></div>
                            </div>
                        );
                    })}
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-12 right-4 h-8 flex justify-between items-end text-xs text-gray-600">
                    {timeLabels.map((label, index) => (
                        <div
                            key={index}
                            className="transform -rotate-45 origin-bottom-left"
                            style={{ position: 'absolute', left: `${label.position}%` }}
                            title={label.fullDate}
                        >
                            {label.label}
                        </div>
                    ))}
                </div>

                {/* Axis labels */}
                <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-700 font-medium">
                    Time (Local)
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                    <span>Human (&lt;{(config.classification.humanThreshold * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                    <span>AI-Assisted</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                    <span>AI-Generated</span>
                </div>
                <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                    <span>High AI (&gt;{(config.classification.aiGeneratedThreshold * 100).toFixed(0)}%)</span>
                </div>
            </div>

            {/* Bucket Configuration Info */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                    <strong>Bucket Analysis:</strong> {config.bucketConfig.intervalMinutes}-minute intervals |
                    {activeBuckets.length} active buckets out of {buckets.length} total |
                    Gaps represent periods with no coding activity
                </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm text-gray-600">
                <div className="text-center">
                    <div className="font-medium text-gray-900">{activeBuckets.length}</div>
                    <div>Active Buckets</div>
                </div>
                <div className="text-center">
                    <div className="font-medium text-gray-900">{events.length}</div>
                    <div>Total Events</div>
                </div>
                <div className="text-center">
                    <div className="font-medium text-gray-900">
                        {duration > 0 ? `${(duration / (1000 * 60)).toFixed(1)}m` : '0m'}
                    </div>
                    <div>Time Span</div>
                </div>
                <div className="text-center">
                    <div className="font-medium text-gray-900">
                        {activeBuckets.length > 0 ?
                            `${(activeBuckets.reduce((sum, b) => sum + (b.aiProbability || 0), 0) / activeBuckets.length * 100).toFixed(1)}%` :
                            '0%'
                        }
                    </div>
                    <div>Avg AI Probability</div>
                </div>
            </div>
        </div>
    );
};

export default TimelineVisualization;
