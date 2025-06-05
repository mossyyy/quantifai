import type { EnhancedChangeEvent } from '../types/ChangeEvent';
import type {
    HeuristicScores,
    AIAttribution,
    AIEvidence,
    DecisionTraceStep,
    WeightedScore,
    AIDetectionConfig,
    ExternalChangeEvent,
    TimeGap,
    AITimeline
} from '../types/AIDetection';

export const DEFAULT_AI_DETECTION_CONFIG: AIDetectionConfig = {
    weights: {
        bulkInsertionScore: 0.25,
        typingSpeedScore: 0.20,
        pastePatternScore: 0.15,
        externalToolScore: 0.25,
        contentPatternScore: 0.10,
        timingAnomalyScore: 0.05
    },
    thresholds: {
        bulkInsertionSize: 100,
        fastTypingSpeed: 300,
        pasteTimeThreshold: 100,
        longPauseThreshold: 30000,
        rapidSequenceThreshold: 100
    },
    classification: {
        humanThreshold: 0.3,
        aiAssistedThreshold: 0.6,
        aiGeneratedThreshold: 0.8
    },
    bucketConfig: {
        intervalMinutes: 15,
        aggregationMethod: 'average',
        minEventsPerBucket: 1
    }
};

/**
 * Pure AI detection engine with no external dependencies.
 * Analyzes change events to determine if code was human-written, AI-assisted, or AI-generated.
 */
export class AIDetectionEngine {
    private config: AIDetectionConfig;

    constructor(config: AIDetectionConfig = DEFAULT_AI_DETECTION_CONFIG) {
        this.config = { ...config };
    }

    /**
     * Update the detection configuration
     */
    updateConfig(newConfig: Partial<AIDetectionConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get a copy of the current configuration
     */
    getConfig(): AIDetectionConfig {
        return { ...this.config };
    }

    /**
     * Analyze a sequence of change events to determine AI attribution
     */
    analyze(changes: EnhancedChangeEvent[]): AIAttribution {
        if (changes.length === 0) {
            return this.createEmptyAttribution();
        }

        const decisionTrace: DecisionTraceStep[] = [];

        // Calculate individual heuristic scores
        const heuristicScores = this.calculateHeuristicScores(changes, decisionTrace);

        // Apply weights and combine scores
        const weightedScores = this.combineScores(heuristicScores, decisionTrace);

        // Make final determination
        const finalResult = this.makeFinalDecision(weightedScores, changes, decisionTrace);

        return {
            ...finalResult,
            evidence: this.extractEvidence(changes),
            timeline: this.extractTimeline(changes)
        };
    }

    private calculateHeuristicScores(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): HeuristicScores {
        const bulkInsertionScore = this.calculateBulkInsertionScore(changes, trace);
        const typingSpeedScore = this.calculateTypingSpeedScore(changes, trace);
        const pastePatternScore = this.calculatePastePatternScore(changes, trace);
        const externalToolScore = this.calculateExternalToolScore(changes, trace);
        const contentPatternScore = this.calculateContentPatternScore(changes, trace);
        const timingAnomalyScore = this.calculateTimingAnomalyScore(changes, trace);

        return {
            bulkInsertionScore,
            typingSpeedScore,
            pastePatternScore,
            externalToolScore,
            contentPatternScore,
            timingAnomalyScore
        };
    }

    private calculateBulkInsertionScore(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): number {
        const bulkChanges = changes.filter(change =>
            change.changeType === 'insert' &&
            change.contentLength > this.config.thresholds.bulkInsertionSize
        );

        const score = Math.min(bulkChanges.length / changes.length, 1.0);

        trace.push({
            step: 'bulk-insertion-analysis',
            input: {
                totalChanges: changes.length,
                bulkChanges: bulkChanges.length,
                threshold: this.config.thresholds.bulkInsertionSize
            },
            output: score,
            reasoning: `Found ${bulkChanges.length} bulk insertions (>${this.config.thresholds.bulkInsertionSize} chars) out of ${changes.length} total changes`
        });

        return score;
    }

    private calculateTypingSpeedScore(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): number {
        const typingSpeeds = changes
            .filter(change => change.instantTypingSpeed > 0)
            .map(change => change.instantTypingSpeed);

        if (typingSpeeds.length === 0) {
            trace.push({
                step: 'typing-speed-analysis',
                input: { speedCount: 0 },
                output: 0,
                reasoning: 'No typing speed data available'
            });
            return 0;
        }

        const averageSpeed = typingSpeeds.reduce((sum, speed) => sum + speed, 0) / typingSpeeds.length;
        const highSpeedCount = typingSpeeds.filter(speed => speed > this.config.thresholds.fastTypingSpeed).length;

        // Score based on average speed and frequency of high-speed typing
        const speedScore = Math.min(averageSpeed / (this.config.thresholds.fastTypingSpeed * 1.5), 1.0);
        const frequencyScore = highSpeedCount / typingSpeeds.length;
        const score = (speedScore + frequencyScore) / 2;

        trace.push({
            step: 'typing-speed-analysis',
            input: {
                averageSpeed,
                highSpeedCount,
                totalSpeeds: typingSpeeds.length,
                threshold: this.config.thresholds.fastTypingSpeed
            },
            output: score,
            reasoning: `Average speed: ${averageSpeed.toFixed(0)} CPM, ${highSpeedCount} high-speed events (>${this.config.thresholds.fastTypingSpeed} CPM)`
        });

        return score;
    }

    private calculatePastePatternScore(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): number {
        const pasteIndicators = changes.filter(change =>
            change.timeSinceLastChange < this.config.thresholds.pasteTimeThreshold &&
            change.contentLength > 50 &&
            change.changeType === 'insert'
        );

        const score = Math.min(pasteIndicators.length / Math.max(changes.length, 1), 1.0);

        trace.push({
            step: 'paste-pattern-analysis',
            input: {
                pasteIndicators: pasteIndicators.length,
                totalChanges: changes.length,
                timeThreshold: this.config.thresholds.pasteTimeThreshold
            },
            output: score,
            reasoning: `Found ${pasteIndicators.length} paste-like patterns (<${this.config.thresholds.pasteTimeThreshold}ms, >50 chars)`
        });

        return score;
    }

    private calculateExternalToolScore(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): number {
        const externalSignatures = changes.filter(change =>
            change.externalToolSignature?.detected
        );

        if (externalSignatures.length === 0) {
            trace.push({
                step: 'external-tool-analysis',
                input: { externalSignatures: 0 },
                output: 0,
                reasoning: 'No external tool signatures detected'
            });
            return 0;
        }

        const averageConfidence = externalSignatures.reduce(
            (sum, change) => sum + (change.externalToolSignature?.confidence || 0),
            0
        ) / externalSignatures.length;

        const score = (externalSignatures.length / changes.length) * averageConfidence;

        trace.push({
            step: 'external-tool-analysis',
            input: {
                externalSignatures: externalSignatures.length,
                averageConfidence,
                totalChanges: changes.length
            },
            output: score,
            reasoning: `Found ${externalSignatures.length} external tool signatures with avg confidence ${averageConfidence.toFixed(3)}`
        });

        return Math.min(score, 1.0);
    }

    private calculateContentPatternScore(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): number {
        const codeBlocks = changes.filter(change => change.isCodeBlock);
        const structuredCode = changes.filter(change =>
            change.languageConstruct !== 'unknown' &&
            change.languageConstruct !== ''
        );
        const comments = changes.filter(change => change.isComment);

        // AI-generated code often has:
        // - Complete code blocks
        // - Well-structured constructs
        // - Explanatory comments
        const codeBlockRatio = codeBlocks.length / Math.max(changes.length, 1);
        const structuredRatio = structuredCode.length / Math.max(changes.length, 1);
        const commentRatio = comments.length / Math.max(changes.length, 1);

        const score = (codeBlockRatio * 0.4 + structuredRatio * 0.4 + commentRatio * 0.2);

        trace.push({
            step: 'content-pattern-analysis',
            input: {
                codeBlocks: codeBlocks.length,
                structuredCode: structuredCode.length,
                comments: comments.length,
                totalChanges: changes.length
            },
            output: score,
            reasoning: `Code blocks: ${codeBlockRatio.toFixed(2)}, Structured: ${structuredRatio.toFixed(2)}, Comments: ${commentRatio.toFixed(2)}`
        });

        return Math.min(score, 1.0);
    }

    private calculateTimingAnomalyScore(changes: EnhancedChangeEvent[], trace: DecisionTraceStep[]): number {
        if (changes.length < 2) {
            trace.push({
                step: 'timing-anomaly-analysis',
                input: { changeCount: changes.length },
                output: 0,
                reasoning: 'Insufficient changes for timing analysis'
            });
            return 0;
        }

        const longPauses = changes.filter(change => change.timeSinceLastChange > this.config.thresholds.longPauseThreshold);
        const rapidSequences = changes.filter(change =>
            change.timeSinceLastChange < this.config.thresholds.rapidSequenceThreshold &&
            change.timeSinceLastChange > 0
        );

        const anomalyRatio = (longPauses.length + rapidSequences.length) / changes.length;
        const score = Math.min(anomalyRatio, 1.0);

        trace.push({
            step: 'timing-anomaly-analysis',
            input: {
                longPauses: longPauses.length,
                rapidSequences: rapidSequences.length,
                totalChanges: changes.length,
                longThreshold: this.config.thresholds.longPauseThreshold,
                rapidThreshold: this.config.thresholds.rapidSequenceThreshold
            },
            output: score,
            reasoning: `Found ${longPauses.length} long pauses (>${this.config.thresholds.longPauseThreshold}ms) and ${rapidSequences.length} rapid sequences (<${this.config.thresholds.rapidSequenceThreshold}ms)`
        });

        return score;
    }

    private combineScores(heuristicScores: HeuristicScores, trace: DecisionTraceStep[]): { [heuristic: string]: WeightedScore } {
        const weightedScores: { [heuristic: string]: WeightedScore } = {};

        for (const [heuristic, rawScore] of Object.entries(heuristicScores)) {
            const weight = this.config.weights[heuristic as keyof typeof this.config.weights] || 0;
            const weightedScore = rawScore * weight;

            weightedScores[heuristic] = {
                rawScore,
                weight,
                weightedScore
            };
        }

        const totalWeightedScore = Object.values(weightedScores)
            .reduce((sum, score) => sum + score.weightedScore, 0);

        trace.push({
            step: 'score-combination',
            input: { heuristicScores, weights: this.config.weights },
            output: { weightedScores, totalWeightedScore },
            reasoning: `Combined weighted scores: ${totalWeightedScore.toFixed(3)}`
        });

        return weightedScores;
    }

    private makeFinalDecision(
        weightedScores: { [heuristic: string]: WeightedScore },
        changes: EnhancedChangeEvent[],
        trace: DecisionTraceStep[]
    ): Pick<AIAttribution, 'source' | 'confidence' | 'aiProbability'> {
        const totalScore = Object.values(weightedScores)
            .reduce((sum, score) => sum + score.weightedScore, 0);

        let source: 'human' | 'ai-assisted' | 'ai-generated' | 'mixed';
        let confidence: number;
        let aiProbability: number;

        if (totalScore < this.config.classification.humanThreshold) {
            source = 'human';
            confidence = 1 - totalScore;
            aiProbability = totalScore;
        } else if (totalScore < this.config.classification.aiAssistedThreshold) {
            source = 'ai-assisted';
            confidence = 0.8;
            aiProbability = totalScore;
        } else if (totalScore < this.config.classification.aiGeneratedThreshold) {
            source = 'ai-generated';
            confidence = totalScore;
            aiProbability = totalScore;
        } else {
            source = 'ai-generated';
            confidence = totalScore;
            aiProbability = Math.min(totalScore + 0.1, 1.0);
        }

        // Check for mixed patterns
        const hasHumanIndicators = changes.some(change =>
            change.instantTypingSpeed > 0 &&
            change.instantTypingSpeed < this.config.thresholds.fastTypingSpeed &&
            change.contentLength < 50
        );

        const hasAIIndicators = changes.some(change =>
            change.externalToolSignature?.detected ||
            (change.contentLength > this.config.thresholds.bulkInsertionSize &&
                change.timeSinceLastChange < this.config.thresholds.pasteTimeThreshold)
        );

        if (hasHumanIndicators && hasAIIndicators && source !== 'human') {
            source = 'mixed';
            confidence = Math.min(confidence, 0.8);
        }

        trace.push({
            step: 'final-decision',
            input: {
                totalScore,
                hasHumanIndicators,
                hasAIIndicators,
                thresholds: this.config.classification
            },
            output: { source, confidence, aiProbability },
            reasoning: `Total score: ${totalScore.toFixed(3)} -> ${source} (confidence: ${confidence.toFixed(3)})`
        });

        return { source, confidence, aiProbability };
    }

    private extractEvidence(changes: EnhancedChangeEvent[]): AIEvidence {
        const bulkChanges = changes
            .filter(change => change.contentLength > this.config.thresholds.bulkInsertionSize)
            .map(change => ({
                size: change.contentLength,
                timespan: change.timeSinceLastChange,
                content: change.content ?
                    change.content.substring(0, 100) + (change.content.length > 100 ? '...' : '') :
                    `[${change.contentLength} chars]`
            }));

        const typingBursts = changes
            .filter(change => change.burstDetected)
            .map(change => ({
                speed: change.instantTypingSpeed,
                duration: change.timeSinceLastChange,
                content: change.content ?
                    change.content.substring(0, 50) + (change.content.length > 50 ? '...' : '') :
                    `[${change.contentLength} chars]`
            }));

        const externalIndicators = changes
            .filter(change => change.externalToolSignature?.detected)
            .flatMap(change => change.externalToolSignature?.indicators || []);

        return {
            externalToolSignature: changes.some(change => change.externalToolSignature?.detected),
            bulkChangePattern: bulkChanges.length > 0,
            timingAnomalies: changes.some(change =>
                change.timeSinceLastChange > this.config.thresholds.longPauseThreshold ||
                (change.timeSinceLastChange < this.config.thresholds.rapidSequenceThreshold && change.timeSinceLastChange > 0)
            ),
            contentCharacteristics: this.extractContentCharacteristics(changes),
            bulkChanges,
            typingBursts,
            externalIndicators,
            suspiciousPatterns: this.identifySuspiciousPatterns(changes)
        };
    }

    private extractContentCharacteristics(changes: EnhancedChangeEvent[]): string[] {
        const characteristics: string[] = [];

        if (changes.some(change => change.isCodeBlock)) {
            characteristics.push('contains-code-blocks');
        }
        if (changes.some(change => change.isComment)) {
            characteristics.push('contains-comments');
        }
        if (changes.some(change => change.languageConstruct === 'function')) {
            characteristics.push('contains-functions');
        }
        if (changes.some(change => change.languageConstruct === 'class')) {
            characteristics.push('contains-classes');
        }

        return characteristics;
    }

    private identifySuspiciousPatterns(changes: EnhancedChangeEvent[]): string[] {
        const patterns: string[] = [];

        // Very fast large insertions
        if (changes.some(change =>
            change.contentLength > this.config.thresholds.bulkInsertionSize &&
            change.timeSinceLastChange < this.config.thresholds.pasteTimeThreshold
        )) {
            patterns.push('rapid-large-insertion');
        }

        // Perfect formatting in bulk changes
        if (changes.some(change =>
            change.contentLength > this.config.thresholds.bulkInsertionSize &&
            change.content?.includes('\n') &&
            change.indentationLevel > 0
        )) {
            patterns.push('formatted-bulk-code');
        }

        return patterns;
    }

    private extractTimeline(changes: EnhancedChangeEvent[]): AITimeline {
        const externalEvents: ExternalChangeEvent[] = changes
            .filter(change => change.externalToolSignature?.detected)
            .map(change => ({
                timestamp: change.timestamp,
                fileUri: change.fileUri,
                changeType: change.contentLength > 200 ? 'bulk-insert' : 'structured-edit',
                contentLength: change.contentLength,
                detectedTool: change.externalToolSignature?.toolType || 'unknown',
                confidence: change.externalToolSignature?.confidence || 0
            }));

        const gaps: TimeGap[] = [];
        for (let i = 1; i < changes.length; i++) {
            const gap = changes[i].timestamp - changes[i - 1].timestamp;
            if (gap > 10000) { // 10+ second gaps
                gaps.push({
                    startTime: changes[i - 1].timestamp,
                    endTime: changes[i].timestamp,
                    duration: gap,
                    likelyActivity: gap > 300000 ? 'extended-break' : 'thinking-pause'
                });
            }
        }

        return {
            vsCodeEvents: changes,
            externalEvents,
            gaps
        };
    }

    private createEmptyAttribution(): AIAttribution {
        return {
            source: 'human',
            confidence: 0,
            aiProbability: 0,
            evidence: {
                externalToolSignature: false,
                bulkChangePattern: false,
                timingAnomalies: false,
                contentCharacteristics: [],
                bulkChanges: [],
                typingBursts: [],
                externalIndicators: [],
                suspiciousPatterns: []
            },
            timeline: {
                vsCodeEvents: [],
                externalEvents: [],
                gaps: []
            }
        };
    }
}
