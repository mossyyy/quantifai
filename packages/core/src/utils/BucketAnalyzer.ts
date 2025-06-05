import type { EnhancedChangeEvent } from '../types/ChangeEvent';
import type { HeuristicScores, AIAttribution } from '../types/AIDetection';
import { AIDetectionEngine } from '../services/AIDetectionEngine';

export interface BucketConfig {
    intervalMinutes: number; // default: 15
    aggregationMethod: 'average' | 'max' | 'weighted'; // default: 'average'
    minEventsPerBucket: number; // default: 1
}

export interface TimeBucket {
    startTime: number;
    endTime: number;
    events: EnhancedChangeEvent[];
    aiProbability: number | null; // null when no events
    heuristicScores: HeuristicScores | null;
    eventCount: number;
    isEmpty: boolean;
    attribution: AIAttribution | null;
}

export interface BucketSummary {
    totalBuckets: number;
    activeBuckets: number;
    emptyBuckets: number;
    averageAIProbability: number;
    maxAIProbability: number;
    timeSpanMs: number;
}

export const DEFAULT_BUCKET_CONFIG: BucketConfig = {
    intervalMinutes: 15,
    aggregationMethod: 'average',
    minEventsPerBucket: 1
};

/**
 * Utility class for analyzing events in time buckets
 */
export class BucketAnalyzer {
    /**
     * Create time buckets from events with specified interval
     */
    static createBuckets(events: EnhancedChangeEvent[], config: BucketConfig = DEFAULT_BUCKET_CONFIG): TimeBucket[] {
        if (events.length === 0) return [];

        const intervalMs = config.intervalMinutes * 60 * 1000;
        const startTime = events[0].timestamp;
        const endTime = events[events.length - 1].timestamp;
        const buckets: TimeBucket[] = [];

        // Create all time intervals, even if empty
        for (let time = startTime; time < endTime; time += intervalMs) {
            const bucketEvents = events.filter(e =>
                e.timestamp >= time && e.timestamp < time + intervalMs
            );

            buckets.push({
                startTime: time,
                endTime: time + intervalMs,
                events: bucketEvents,
                eventCount: bucketEvents.length,
                isEmpty: bucketEvents.length < config.minEventsPerBucket,
                aiProbability: null,
                heuristicScores: null,
                attribution: null
            });
        }

        return buckets;
    }

    /**
     * Analyze a single bucket using the AI detection engine
     */
    static analyzeBucket(bucket: TimeBucket, aiEngine: AIDetectionEngine): TimeBucket {
        if (bucket.isEmpty) {
            return bucket; // Leave empty buckets unchanged
        }

        const analysis = aiEngine.analyze(bucket.events);

        return {
            ...bucket,
            aiProbability: analysis.aiProbability,
            heuristicScores: this.extractHeuristicScores(analysis),
            attribution: analysis
        };
    }

    /**
     * Analyze all buckets in a collection
     */
    static analyzeBuckets(buckets: TimeBucket[], aiEngine: AIDetectionEngine): TimeBucket[] {
        return buckets.map(bucket => this.analyzeBucket(bucket, aiEngine));
    }

    /**
     * Create and analyze buckets in one step
     */
    static createAndAnalyzeBuckets(
        events: EnhancedChangeEvent[],
        aiEngine: AIDetectionEngine,
        config: BucketConfig = DEFAULT_BUCKET_CONFIG
    ): TimeBucket[] {
        const buckets = this.createBuckets(events, config);
        return this.analyzeBuckets(buckets, aiEngine);
    }

    /**
     * Generate summary statistics for a collection of buckets
     */
    static summarizeBuckets(buckets: TimeBucket[]): BucketSummary {
        const activeBuckets = buckets.filter(b => !b.isEmpty);
        const aiProbabilities = activeBuckets
            .map(b => b.aiProbability)
            .filter((p): p is number => p !== null);

        const averageAIProbability = aiProbabilities.length > 0
            ? aiProbabilities.reduce((sum, p) => sum + p, 0) / aiProbabilities.length
            : 0;

        const maxAIProbability = aiProbabilities.length > 0
            ? Math.max(...aiProbabilities)
            : 0;

        const timeSpanMs = buckets.length > 0
            ? buckets[buckets.length - 1].endTime - buckets[0].startTime
            : 0;

        return {
            totalBuckets: buckets.length,
            activeBuckets: activeBuckets.length,
            emptyBuckets: buckets.length - activeBuckets.length,
            averageAIProbability,
            maxAIProbability,
            timeSpanMs
        };
    }

    /**
     * Get buckets within a specific time range
     */
    static filterBucketsByTimeRange(
        buckets: TimeBucket[],
        startTime: number,
        endTime: number
    ): TimeBucket[] {
        return buckets.filter(bucket =>
            bucket.startTime >= startTime && bucket.endTime <= endTime
        );
    }

    /**
     * Get buckets with AI probability above a threshold
     */
    static filterBucketsByAIProbability(
        buckets: TimeBucket[],
        threshold: number
    ): TimeBucket[] {
        return buckets.filter(bucket =>
            bucket.aiProbability !== null && bucket.aiProbability >= threshold
        );
    }

    /**
     * Extract heuristic scores from AI attribution
     */
    private static extractHeuristicScores(attribution: AIAttribution): HeuristicScores {
        // The AIDetectionEngine doesn't directly expose heuristic scores in the result
        // We'll need to calculate them separately or modify the engine
        // For now, we'll create a placeholder that calculates basic scores
        const events = attribution.timeline.vsCodeEvents as EnhancedChangeEvent[];

        if (events.length === 0) {
            return {
                bulkInsertionScore: 0,
                typingSpeedScore: 0,
                pastePatternScore: 0,
                externalToolScore: 0,
                contentPatternScore: 0,
                timingAnomalyScore: 0
            };
        }

        // Basic heuristic calculations
        const bulkChanges = events.filter(e => e.contentLength > 100);
        const bulkInsertionScore = Math.min(bulkChanges.length / events.length, 1.0);

        const typingSpeeds = events.filter(e => e.instantTypingSpeed > 0).map(e => e.instantTypingSpeed);
        const avgSpeed = typingSpeeds.length > 0 ? typingSpeeds.reduce((a, b) => a + b, 0) / typingSpeeds.length : 0;
        const typingSpeedScore = Math.min(avgSpeed / 300, 1.0);

        const pastePatterns = events.filter(e => e.timeSinceLastChange < 100 && e.contentLength > 50);
        const pastePatternScore = Math.min(pastePatterns.length / Math.max(events.length, 1), 1.0);

        const externalEvents = events.filter(e => e.externalToolSignature?.detected);
        const externalToolScore = externalEvents.length > 0 ?
            externalEvents.reduce((sum, e) => sum + (e.externalToolSignature?.confidence || 0), 0) / externalEvents.length : 0;

        const codeBlocks = events.filter(e => e.isCodeBlock);
        const comments = events.filter(e => e.isComment);
        const contentPatternScore = (codeBlocks.length * 0.6 + comments.length * 0.4) / Math.max(events.length, 1);

        const longPauses = events.filter(e => e.timeSinceLastChange > 30000);
        const rapidSequences = events.filter(e => e.timeSinceLastChange < 100);
        const timingAnomalyScore = (longPauses.length + rapidSequences.length) / Math.max(events.length, 1);

        return {
            bulkInsertionScore: Math.min(bulkInsertionScore, 1.0),
            typingSpeedScore: Math.min(typingSpeedScore, 1.0),
            pastePatternScore: Math.min(pastePatternScore, 1.0),
            externalToolScore: Math.min(externalToolScore, 1.0),
            contentPatternScore: Math.min(contentPatternScore, 1.0),
            timingAnomalyScore: Math.min(timingAnomalyScore, 1.0)
        };
    }
}
