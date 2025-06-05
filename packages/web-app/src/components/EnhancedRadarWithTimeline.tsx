'use client';

import React, { useState, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { HeuristicScores, AIDetectionConfig, EnhancedChangeEvent, TimeBucket } from '@ai-analyzer/core';
import { useAIDetection } from '@/lib/hooks/useAIDetection';

interface EnhancedRadarWithTimelineProps {
    scores: HeuristicScores;
    events: EnhancedChangeEvent[];
    config: AIDetectionConfig;
    title: string;
}

const EnhancedRadarWithTimeline: React.FC<EnhancedRadarWithTimelineProps> = ({
    scores,
    events,
    config,
    title
}) => {
    const { analyzeBuckets, analyzeEvents } = useAIDetection();
    const [selectedInterval, setSelectedInterval] = useState(5); // Default 5 minutes
    const [selectedBucket, setSelectedBucket] = useState(0); // Selected bucket index
    const [selectedFile, setSelectedFile] = useState<string | null>(null); // Selected file for individual analysis
    const [viewMode, setViewMode] = useState<'all' | 'file'>('all'); // Toggle between all changes and specific file

    // Create buckets with selected interval
    const buckets = useMemo(() => {
        if (events.length === 0) return [];
        const intervalConfig = { ...config.bucketConfig, intervalMinutes: selectedInterval };
        return analyzeBuckets(events, intervalConfig);
    }, [events, config.bucketConfig, selectedInterval]);

    // Get the selected bucket
    const currentBucket = useMemo(() => {
        const activeBuckets = buckets.filter(bucket => !bucket.isEmpty);
        if (activeBuckets.length === 0) return null;
        const bucketIndex = Math.min(selectedBucket, activeBuckets.length - 1);
        return activeBuckets[bucketIndex];
    }, [buckets, selectedBucket]);

    // Get files in the current bucket
    const filesInBucket = useMemo(() => {
        if (!currentBucket) return [];
        const fileMap = new Map<string, { count: number; events: EnhancedChangeEvent[] }>();

        currentBucket.events.forEach(event => {
            const fileName = event.fileUri.split('/').pop() || event.fileUri;
            if (!fileMap.has(fileName)) {
                fileMap.set(fileName, { count: 0, events: [] });
            }
            const fileData = fileMap.get(fileName)!;
            fileData.count++;
            fileData.events.push(event);
        });

        return Array.from(fileMap.entries()).map(([fileName, data]) => ({
            fileName,
            fullPath: data.events[0].fileUri,
            eventCount: data.count,
            events: data.events
        })).sort((a, b) => b.eventCount - a.eventCount);
    }, [currentBucket]);

    // Calculate scores for selected bucket or file
    const filteredScores = useMemo(() => {
        if (!currentBucket) return scores;

        let eventsToAnalyze = currentBucket.events;

        // If a specific file is selected and we're in file view mode, filter events
        if (viewMode === 'file' && selectedFile) {
            const fileData = filesInBucket.find(f => f.fileName === selectedFile);
            if (fileData) {
                eventsToAnalyze = fileData.events;
            }
        }

        // If we have specific events to analyze, calculate scores for them
        if (eventsToAnalyze.length > 0 && viewMode === 'file') {
            try {
                // Calculate basic heuristic scores directly from events without calling analyzeEvents
                const bulkChanges = eventsToAnalyze.filter(e => e.contentLength > 100);
                const bulkInsertionScore = Math.min(bulkChanges.length / eventsToAnalyze.length, 1.0);

                const typingSpeeds = eventsToAnalyze.filter(e => e.instantTypingSpeed > 0).map(e => e.instantTypingSpeed);
                const avgSpeed = typingSpeeds.length > 0 ? typingSpeeds.reduce((a, b) => a + b, 0) / typingSpeeds.length : 0;
                const typingSpeedScore = Math.min(avgSpeed / 300, 1.0);

                const pastePatterns = eventsToAnalyze.filter(e => e.timeSinceLastChange < 100 && e.contentLength > 50);
                const pastePatternScore = Math.min(pastePatterns.length / Math.max(eventsToAnalyze.length, 1), 1.0);

                const externalEvents = eventsToAnalyze.filter(e => e.externalToolSignature?.detected);
                const externalToolScore = externalEvents.length > 0 ?
                    externalEvents.reduce((sum, e) => sum + (e.externalToolSignature?.confidence || 0), 0) / externalEvents.length : 0;

                const codeBlocks = eventsToAnalyze.filter(e => e.isCodeBlock);
                const comments = eventsToAnalyze.filter(e => e.isComment);
                const contentPatternScore = (codeBlocks.length * 0.6 + comments.length * 0.4) / Math.max(eventsToAnalyze.length, 1);

                const longPauses = eventsToAnalyze.filter(e => e.timeSinceLastChange > 30000);
                const rapidSequences = eventsToAnalyze.filter(e => e.timeSinceLastChange < 100);
                const timingAnomalyScore = (longPauses.length + rapidSequences.length) / Math.max(eventsToAnalyze.length, 1);

                return {
                    bulkInsertionScore: Math.min(bulkInsertionScore, 1.0),
                    typingSpeedScore: Math.min(typingSpeedScore, 1.0),
                    pastePatternScore: Math.min(pastePatternScore, 1.0),
                    externalToolScore: Math.min(externalToolScore, 1.0),
                    contentPatternScore: Math.min(contentPatternScore, 1.0),
                    timingAnomalyScore: Math.min(timingAnomalyScore, 1.0)
                };
            } catch (error) {
                console.warn('Error calculating scores:', error);
            }
        }

        // Fallback to bucket scores or scaled original scores
        if (currentBucket.heuristicScores) {
            return currentBucket.heuristicScores;
        }

        // Use the bucket's AI probability to scale the scores
        const bucketProbability = currentBucket.aiProbability || 0;
        const originalAvg = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length;
        const scaleFactor = originalAvg > 0 ? bucketProbability / originalAvg : 1;

        return {
            bulkInsertionScore: Math.min(1, scores.bulkInsertionScore * scaleFactor),
            typingSpeedScore: Math.min(1, scores.typingSpeedScore * scaleFactor),
            pastePatternScore: Math.min(1, scores.pastePatternScore * scaleFactor),
            externalToolScore: Math.min(1, scores.externalToolScore * scaleFactor),
            contentPatternScore: Math.min(1, scores.contentPatternScore * scaleFactor),
            timingAnomalyScore: Math.min(1, scores.timingAnomalyScore * scaleFactor)
        };
    }, [currentBucket, scores, viewMode, selectedFile, filesInBucket, config]);

    const radarData = [
        {
            subject: 'Bulk Insertion',
            score: filteredScores.bulkInsertionScore,
            fullMark: 1
        },
        {
            subject: 'Typing Speed',
            score: filteredScores.typingSpeedScore,
            fullMark: 1
        },
        {
            subject: 'Paste Pattern',
            score: filteredScores.pastePatternScore,
            fullMark: 1
        },
        {
            subject: 'External Tool',
            score: filteredScores.externalToolScore,
            fullMark: 1
        },
        {
            subject: 'Content Pattern',
            score: filteredScores.contentPatternScore,
            fullMark: 1
        },
        {
            subject: 'Timing Anomaly',
            score: filteredScores.timingAnomalyScore,
            fullMark: 1
        }
    ];

    const averageScore = Object.values(filteredScores).reduce((sum, score) => sum + score, 0) / Object.values(filteredScores).length;

    // Timeline rendering logic
    const renderTimeline = () => {
        if (events.length === 0 || buckets.length === 0) {
            return (
                <div className="w-full h-32 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                    <p>No timeline data available</p>
                </div>
            );
        }

        const startTime = buckets[0].startTime;
        const endTime = buckets[buckets.length - 1].endTime;
        const duration = endTime - startTime;
        const activeBuckets = buckets.filter(bucket => !bucket.isEmpty);

        const getColorForProbability = (probability: number) => {
            if (probability < config.classification.humanThreshold) {
                return 'bg-green-500';
            } else if (probability < config.classification.aiAssistedThreshold) {
                return 'bg-yellow-500';
            } else if (probability < config.classification.aiGeneratedThreshold) {
                return 'bg-orange-500';
            } else {
                return 'bg-red-500';
            }
        };

        return (
            <div className="relative bg-gray-50 rounded-lg p-4" style={{ height: '120px' }}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-4 w-12 flex flex-col justify-between text-xs text-gray-600">
                    <div className="text-right pr-2">1.0</div>
                    <div className="text-right pr-2">0.5</div>
                    <div className="text-right pr-2">0.0</div>
                </div>

                {/* Chart area */}
                <div className="relative ml-12 mr-4" style={{ height: '80px' }}>
                    {/* Grid lines */}
                    <div className="absolute left-0 right-0 border-t border-gray-200" style={{ top: '0%' }}></div>
                    <div className="absolute left-0 right-0 border-t border-gray-200" style={{ top: '50%' }}></div>
                    <div className="absolute left-0 right-0 border-t border-gray-400" style={{ bottom: '0%' }}></div>

                    {/* Threshold lines */}
                    <div
                        className="absolute left-0 right-0 border-t-2 border-red-300 border-dashed"
                        style={{ bottom: `${config.classification.aiGeneratedThreshold * 100}%` }}
                        title={`AI Generated Threshold: ${(config.classification.aiGeneratedThreshold * 100).toFixed(0)}%`}
                    ></div>
                    <div
                        className="absolute left-0 right-0 border-t-2 border-orange-300 border-dashed"
                        style={{ bottom: `${config.classification.aiAssistedThreshold * 100}%` }}
                        title={`AI Assisted Threshold: ${(config.classification.aiAssistedThreshold * 100).toFixed(0)}%`}
                    ></div>
                    <div
                        className="absolute left-0 right-0 border-t-2 border-green-300 border-dashed"
                        style={{ bottom: `${config.classification.humanThreshold * 100}%` }}
                        title={`Human Threshold: ${(config.classification.humanThreshold * 100).toFixed(0)}%`}
                    ></div>

                    {/* Data points */}
                    {activeBuckets.map((bucket, index) => {
                        const xPosition = duration > 0 ? ((bucket.startTime - startTime) / duration) * 100 : 0;
                        const yPosition = (bucket.aiProbability || 0) * 100;
                        const colorClass = getColorForProbability(bucket.aiProbability || 0);
                        const isSelected = index === selectedBucket;

                        return (
                            <div
                                key={`bucket-${bucket.startTime}`}
                                className="absolute transform -translate-x-1/2"
                                style={{
                                    left: `${xPosition}%`,
                                    bottom: `${yPosition}%`
                                }}
                                title={`AI Probability: ${((bucket.aiProbability || 0) * 100).toFixed(1)}%`}
                            >
                                <div className={`${isSelected ? 'w-5 h-5 border-2' : 'w-3 h-3 border'} rounded-full border-white shadow-sm ${colorClass} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}></div>
                            </div>
                        );
                    })}
                </div>

                {/* Time labels */}
                <div className="absolute bottom-0 left-12 right-4 text-xs text-gray-600 flex justify-between">
                    <span>{new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        );
    };

    const activeBuckets = buckets.filter(bucket => !bucket.isEmpty);

    return (
        <div className="w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

            {/* Timeline Section */}
            <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-2">Timeline Analysis</h4>
                {renderTimeline()}
            </div>

            {/* Interval Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bucket Interval: {selectedInterval} minutes
                </label>
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={selectedInterval}
                    onChange={(e) => {
                        setSelectedInterval(parseInt(e.target.value));
                        setSelectedBucket(0); // Reset to first bucket when interval changes
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 min</span>
                    <span>30 min</span>
                </div>
            </div>

            {/* Bucket Selection */}
            {activeBuckets.length > 0 && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Bucket: {selectedBucket + 1} of {activeBuckets.length}
                        {currentBucket && (
                            <span className="ml-2 text-gray-500">
                                ({new Date(currentBucket.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                {new Date(currentBucket.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                        )}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max={activeBuckets.length - 1}
                        value={selectedBucket}
                        onChange={(e) => setSelectedBucket(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>First</span>
                        <span>Last</span>
                    </div>
                </div>
            )}

            {/* File Analysis Section */}
            {currentBucket && filesInBucket.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-700">File Analysis</h4>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => {
                                    setViewMode('all');
                                    setSelectedFile(null);
                                }}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'all'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                All Changes
                            </button>
                            <button
                                onClick={() => setViewMode('file')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'file'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                By File
                            </button>
                        </div>
                    </div>

                    {/* Files in current bucket */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                            Files changed in this interval ({filesInBucket.length} files):
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                            {filesInBucket.map((file) => (
                                <div
                                    key={file.fileName}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedFile === file.fileName && viewMode === 'file'
                                        ? 'bg-blue-100 border border-blue-300'
                                        : 'bg-white hover:bg-gray-100 border border-gray-200'
                                        }`}
                                    onClick={() => {
                                        if (viewMode === 'file') {
                                            setSelectedFile(selectedFile === file.fileName ? null : file.fileName);
                                        } else {
                                            setViewMode('file');
                                            setSelectedFile(file.fileName);
                                        }
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {file.fileName}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {file.fullPath}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-2">
                                        <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                                            {file.eventCount} changes
                                        </span>
                                        {selectedFile === file.fileName && viewMode === 'file' && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {viewMode === 'file' && selectedFile && (
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="text-xs text-blue-700">
                                    <strong>Analyzing:</strong> {selectedFile}
                                    <span className="ml-2">
                                        ({filesInBucket.find(f => f.fileName === selectedFile)?.eventCount} changes)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Radar Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" className="text-xs" />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 1]}
                            tick={false}
                        />

                        <Radar
                            name="Heuristic Scores"
                            dataKey="score"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Score Summary */}
            <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                        Average Score {
                            viewMode === 'file' && selectedFile
                                ? `(${selectedFile})`
                                : currentBucket
                                    ? '(Selected Bucket)'
                                    : '(Overall)'
                        }:
                    </span>
                    <span className={`text-sm font-bold ${averageScore > 0.7 ? 'text-red-600' :
                        averageScore > 0.4 ? 'text-orange-600' :
                            'text-green-600'
                        }`}>
                        {averageScore.toFixed(3)}
                    </span>
                </div>

                {/* Individual Scores */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                        <span>Bulk Insertion:</span>
                        <span>{filteredScores.bulkInsertionScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Typing Speed:</span>
                        <span>{filteredScores.typingSpeedScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Paste Pattern:</span>
                        <span>{filteredScores.pastePatternScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>External Tool:</span>
                        <span>{filteredScores.externalToolScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Content Pattern:</span>
                        <span>{filteredScores.contentPatternScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Timing Anomaly:</span>
                        <span>{filteredScores.timingAnomalyScore.toFixed(3)}</span>
                    </div>
                </div>
            </div>


            {/* Stats for selected bucket */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="text-center">
                    <div className="font-medium text-gray-900">
                        {currentBucket ? currentBucket.eventCount : activeBuckets.length}
                    </div>
                    <div>{currentBucket ? 'Events in Bucket' : 'Total Buckets'}</div>
                </div>
                <div className="text-center">
                    <div className="font-medium text-gray-900">{selectedInterval}min</div>
                    <div>Bucket Interval</div>
                </div>
                <div className="text-center">
                    <div className="font-medium text-gray-900">
                        {currentBucket ?
                            `${((currentBucket.aiProbability || 0) * 100).toFixed(1)}%` :
                            activeBuckets.length > 0 ?
                                `${(activeBuckets.reduce((sum, b) => sum + (b.aiProbability || 0), 0) / activeBuckets.length * 100).toFixed(1)}%` :
                                '0%'
                        }
                    </div>
                    <div>AI Probability</div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedRadarWithTimeline;
