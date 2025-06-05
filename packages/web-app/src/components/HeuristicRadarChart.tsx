'use client';

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { HeuristicScores } from '@ai-analyzer/core';

interface HeuristicRadarChartProps {
    scores: HeuristicScores;
    title: string;
}

const HeuristicRadarChart: React.FC<HeuristicRadarChartProps> = ({ scores, title }) => {
    const data = [
        {
            subject: 'Bulk Insertion',
            score: scores.bulkInsertionScore,
            fullMark: 1
        },
        {
            subject: 'Typing Speed',
            score: scores.typingSpeedScore,
            fullMark: 1
        },
        {
            subject: 'Paste Pattern',
            score: scores.pastePatternScore,
            fullMark: 1
        },
        {
            subject: 'External Tool',
            score: scores.externalToolScore,
            fullMark: 1
        },
        {
            subject: 'Content Pattern',
            score: scores.contentPatternScore,
            fullMark: 1
        },
        {
            subject: 'Timing Anomaly',
            score: scores.timingAnomalyScore,
            fullMark: 1
        }
    ];

    const averageScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length;

    return (
        <div className="w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data}>
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
                    <span className="text-sm font-medium text-gray-700">Average Score:</span>
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
                        <span>{scores.bulkInsertionScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Typing Speed:</span>
                        <span>{scores.typingSpeedScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Paste Pattern:</span>
                        <span>{scores.pastePatternScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>External Tool:</span>
                        <span>{scores.externalToolScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Content Pattern:</span>
                        <span>{scores.contentPatternScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Timing Anomaly:</span>
                        <span>{scores.timingAnomalyScore.toFixed(3)}</span>
                    </div>
                </div>
            </div>

            {/* Risk Assessment */}
            <div className="mt-4 p-3 rounded-lg bg-gray-50">
                <div className="text-sm">
                    <span className="font-medium text-gray-700">Risk Assessment: </span>
                    <span className={`font-bold ${averageScore > 0.7 ? 'text-red-600' :
                        averageScore > 0.4 ? 'text-orange-600' :
                            'text-green-600'
                        }`}>
                        {averageScore > 0.7 ? 'High' : averageScore > 0.4 ? 'Medium' : 'Low'}
                    </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                    {averageScore > 0.7
                        ? 'Strong indicators of AI assistance detected'
                        : averageScore > 0.4
                            ? 'Some indicators of AI assistance present'
                            : 'Patterns consistent with human coding'
                    }
                </p>
            </div>
        </div>
    );
};

export default HeuristicRadarChart;
