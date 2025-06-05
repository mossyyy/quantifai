import type { EnhancedChangeEvent } from '../types/ChangeEvent';

/**
 * Calculates basic statistics for a numeric array
 */
export interface Statistics {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    count: number;
}

/**
 * Calculates statistics for an array of numbers
 */
export function calculateStatistics(values: number[]): Statistics {
    if (values.length === 0) {
        return {
            mean: 0,
            median: 0,
            min: 0,
            max: 0,
            stdDev: 0,
            count: 0
        };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    // Calculate median
    const median = count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];

    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
        mean,
        median,
        min: sorted[0],
        max: sorted[count - 1],
        stdDev,
        count
    };
}

/**
 * Calculates typing speed statistics from change events
 */
export function calculateTypingSpeedStats(events: EnhancedChangeEvent[]): Statistics {
    const speeds = events
        .filter(event => event.instantTypingSpeed > 0)
        .map(event => event.instantTypingSpeed);

    return calculateStatistics(speeds);
}

/**
 * Calculates content length statistics from change events
 */
export function calculateContentLengthStats(events: EnhancedChangeEvent[]): Statistics {
    const lengths = events.map(event => event.contentLength);
    return calculateStatistics(lengths);
}

/**
 * Calculates time gap statistics between changes
 */
export function calculateTimeGapStats(events: EnhancedChangeEvent[]): Statistics {
    if (events.length < 2) {
        return calculateStatistics([]);
    }

    const gaps: number[] = [];
    for (let i = 1; i < events.length; i++) {
        gaps.push(events[i].timestamp - events[i - 1].timestamp);
    }

    return calculateStatistics(gaps);
}

/**
 * Calculates the total time span of a sequence of events
 */
export function calculateTimeSpan(events: EnhancedChangeEvent[]): number {
    if (events.length < 2) return 0;

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
}

/**
 * Calculates the total content length across all events
 */
export function calculateTotalContentLength(events: EnhancedChangeEvent[]): number {
    return events.reduce((total, event) => total + event.contentLength, 0);
}

/**
 * Calculates the percentage of events that match a predicate
 */
export function calculatePercentage<T>(
    items: T[],
    predicate: (item: T) => boolean
): number {
    if (items.length === 0) return 0;

    const matchingCount = items.filter(predicate).length;
    return (matchingCount / items.length) * 100;
}

/**
 * Calculates the rate of events per minute
 */
export function calculateEventRate(events: EnhancedChangeEvent[]): number {
    if (events.length < 2) return 0;

    const timeSpanMs = calculateTimeSpan(events);
    const timeSpanMinutes = timeSpanMs / (1000 * 60);

    return timeSpanMinutes > 0 ? events.length / timeSpanMinutes : 0;
}

/**
 * Calculates average typing speed across all events with typing data
 */
export function calculateAverageTypingSpeed(events: EnhancedChangeEvent[]): number {
    const typingEvents = events.filter(event => event.instantTypingSpeed > 0);

    if (typingEvents.length === 0) return 0;

    const totalSpeed = typingEvents.reduce((sum, event) => sum + event.instantTypingSpeed, 0);
    return totalSpeed / typingEvents.length;
}

/**
 * Calculates the burst ratio (percentage of events marked as bursts)
 */
export function calculateBurstRatio(events: EnhancedChangeEvent[]): number {
    return calculatePercentage(events, event => event.burstDetected);
}

/**
 * Calculates the code block ratio (percentage of events that are code blocks)
 */
export function calculateCodeBlockRatio(events: EnhancedChangeEvent[]): number {
    return calculatePercentage(events, event => event.isCodeBlock);
}

/**
 * Calculates the comment ratio (percentage of events that are comments)
 */
export function calculateCommentRatio(events: EnhancedChangeEvent[]): number {
    return calculatePercentage(events, event => event.isComment);
}

/**
 * Calculates the external tool detection ratio
 */
export function calculateExternalToolRatio(events: EnhancedChangeEvent[]): number {
    return calculatePercentage(events, event => event.externalToolSignature?.detected || false);
}

/**
 * Finds outliers in a numeric array using the IQR method
 */
export function findOutliers(values: number[]): {
    outliers: number[];
    lowerBound: number;
    upperBound: number;
    q1: number;
    q3: number;
    iqr: number;
} {
    if (values.length < 4) {
        return {
            outliers: [],
            lowerBound: 0,
            upperBound: 0,
            q1: 0,
            q3: 0,
            iqr: 0
        };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate quartiles
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    // Calculate bounds
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Find outliers
    const outliers = values.filter(value => value < lowerBound || value > upperBound);

    return {
        outliers,
        lowerBound,
        upperBound,
        q1,
        q3,
        iqr
    };
}

/**
 * Calculates a rolling average for a numeric array
 */
export function calculateRollingAverage(values: number[], windowSize: number): number[] {
    if (windowSize <= 0 || windowSize > values.length) {
        return values.slice();
    }

    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = values.slice(start, i + 1);
        const average = window.reduce((sum, val) => sum + val, 0) / window.length;
        result.push(average);
    }

    return result;
}

/**
 * Normalizes values to a 0-1 range
 */
export function normalizeValues(values: number[]): number[] {
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
        return values.map(() => 0);
    }

    return values.map(value => (value - min) / range);
}

/**
 * Calculates the correlation coefficient between two arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
        return 0;
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}
