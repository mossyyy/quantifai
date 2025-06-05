import { v4 as uuidv4 } from 'uuid';
import {
    AIDetectionEngine,
    DEFAULT_AI_DETECTION_CONFIG,
    type EnhancedChangeEvent,
    type AIAttribution,
    type AIDetectionConfig,
    type HeuristicScores,
    type WeightedScore
} from '@ai-analyzer/core';
import { MetricsLogger } from './MetricsLogger';

// Extension-specific metrics logging interface (since this is extension-specific)
interface AIDetectionMetricsLog {
    timestamp: number;
    sessionId: string;
    fileUri: string;
    analysisId: string;
    totalChanges: number;
    timeSpanMs: number;
    contentLengthTotal: number;
    heuristicScores: HeuristicScores;
    weightedScores: { [heuristic: string]: WeightedScore };
    finalConfidence: number;
    aiProbability: number;
    classification: 'human' | 'ai-assisted' | 'ai-generated' | 'mixed';
    evidence: any;
    decisionTrace: any[];
    _loggedAt: number;
    _version: string;
}

export class AIDetectionService {
    private logger: MetricsLogger;
    private currentSessionId: string;
    private engine: AIDetectionEngine;

    constructor(logger: MetricsLogger, sessionId: string, config?: Partial<AIDetectionConfig>) {
        this.logger = logger;
        this.currentSessionId = sessionId;
        this.engine = new AIDetectionEngine(config ? { ...DEFAULT_AI_DETECTION_CONFIG, ...config } : DEFAULT_AI_DETECTION_CONFIG);
    }

    async analyze(changes: EnhancedChangeEvent[]): Promise<AIAttribution> {
        if (changes.length === 0) {
            return this.engine.analyze([]);
        }

        const analysisId = uuidv4();
        const startTime = Date.now();

        // Use the core engine for analysis
        const result = this.engine.analyze(changes);

        // Log comprehensive metrics for extension-specific tracking
        await this.logAnalysisMetrics({
            timestamp: startTime,
            sessionId: this.currentSessionId,
            fileUri: changes[0]?.fileUri || '',
            analysisId,
            totalChanges: changes.length,
            timeSpanMs: this.calculateTimeSpan(changes),
            contentLengthTotal: changes.reduce((sum, c) => sum + c.contentLength, 0),
            heuristicScores: this.createPlaceholderHeuristicScores(),
            weightedScores: this.createPlaceholderWeightedScores(),
            finalConfidence: result.confidence,
            aiProbability: result.aiProbability,
            classification: result.source,
            evidence: result.evidence,
            decisionTrace: []
        });

        return result;
    }

    /**
     * Update the AI detection configuration
     */
    updateConfig(config: Partial<AIDetectionConfig>): void {
        this.engine.updateConfig(config);
    }

    /**
     * Get the current AI detection configuration
     */
    getConfig(): AIDetectionConfig {
        return this.engine.getConfig();
    }

    private calculateTimeSpan(changes: EnhancedChangeEvent[]): number {
        if (changes.length < 2) return 0;
        return changes[changes.length - 1].timestamp - changes[0].timestamp;
    }

    private async logAnalysisMetrics(metrics: Omit<AIDetectionMetricsLog, '_loggedAt' | '_version'>): Promise<void> {
        await this.logger.logAIDetectionMetrics({
            ...metrics,
            _loggedAt: Date.now(),
            _version: '1.0'
        });
    }

    /**
     * Create placeholder heuristic scores since core engine doesn't expose them
     */
    private createPlaceholderHeuristicScores(): HeuristicScores {
        return {
            bulkInsertionScore: 0,
            typingSpeedScore: 0,
            pastePatternScore: 0,
            externalToolScore: 0,
            contentPatternScore: 0,
            timingAnomalyScore: 0
        };
    }

    /**
     * Create placeholder weighted scores since core engine doesn't expose them
     */
    private createPlaceholderWeightedScores(): { [heuristic: string]: WeightedScore } {
        return {};
    }

    /**
     * Public method to update session ID
     */
    public updateSessionId(sessionId: string): void {
        this.currentSessionId = sessionId;
    }
}
