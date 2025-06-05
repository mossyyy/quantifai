import type { EnhancedChangeEvent } from '../types/ChangeEvent';
import type { AIDetectionConfig } from '../types/AIDetection';

/**
 * Validates that a change event has all required fields
 */
export function validateChangeEvent(event: any): event is EnhancedChangeEvent {
    return (
        typeof event === 'object' &&
        event !== null &&
        typeof event.timestamp === 'number' &&
        typeof event.sessionId === 'string' &&
        typeof event.fileUri === 'string' &&
        typeof event.eventId === 'string' &&
        ['insert', 'delete', 'replace'].includes(event.changeType) &&
        typeof event.position === 'object' &&
        typeof event.position.line === 'number' &&
        typeof event.position.character === 'number' &&
        typeof event.contentLength === 'number' &&
        typeof event.timeSinceLastChange === 'number' &&
        typeof event.timeSinceSessionStart === 'number' &&
        typeof event.timeSinceFileOpen === 'number' &&
        ['live', 'history', 'external'].includes(event.source) &&
        typeof event.vsCodeActive === 'boolean' &&
        typeof event.cursorPosition === 'object' &&
        typeof event.instantTypingSpeed === 'number' &&
        typeof event.rollingTypingSpeed === 'number' &&
        typeof event.burstDetected === 'boolean' &&
        typeof event.pauseBeforeChange === 'number' &&
        typeof event.isCodeBlock === 'boolean' &&
        typeof event.isComment === 'boolean' &&
        typeof event.isWhitespace === 'boolean' &&
        typeof event.languageConstruct === 'string' &&
        typeof event.indentationLevel === 'number'
    );
}

/**
 * Validates that an AI detection config has all required fields and valid values
 */
export function validateAIDetectionConfig(config: any): config is AIDetectionConfig {
    if (typeof config !== 'object' || config === null) {
        return false;
    }

    // Check weights
    if (typeof config.weights !== 'object' || config.weights === null) {
        return false;
    }

    const requiredWeights = [
        'bulkInsertionScore',
        'typingSpeedScore',
        'pastePatternScore',
        'externalToolScore',
        'contentPatternScore',
        'timingAnomalyScore'
    ];

    for (const weight of requiredWeights) {
        if (typeof config.weights[weight] !== 'number' ||
            config.weights[weight] < 0 ||
            config.weights[weight] > 1) {
            return false;
        }
    }

    // Check thresholds
    if (typeof config.thresholds !== 'object' || config.thresholds === null) {
        return false;
    }

    const requiredThresholds = [
        'bulkInsertionSize',
        'fastTypingSpeed',
        'pasteTimeThreshold',
        'longPauseThreshold',
        'rapidSequenceThreshold'
    ];

    for (const threshold of requiredThresholds) {
        if (typeof config.thresholds[threshold] !== 'number' || config.thresholds[threshold] < 0) {
            return false;
        }
    }

    // Check classification thresholds
    if (typeof config.classification !== 'object' || config.classification === null) {
        return false;
    }

    const requiredClassification = ['humanThreshold', 'aiAssistedThreshold', 'aiGeneratedThreshold'];

    for (const threshold of requiredClassification) {
        if (typeof config.classification[threshold] !== 'number' ||
            config.classification[threshold] < 0 ||
            config.classification[threshold] > 1) {
            return false;
        }
    }

    // Check that thresholds are in logical order
    if (config.classification.humanThreshold >= config.classification.aiAssistedThreshold ||
        config.classification.aiAssistedThreshold >= config.classification.aiGeneratedThreshold) {
        return false;
    }

    return true;
}

/**
 * Sanitizes change events by removing sensitive content while preserving analysis data
 */
export function sanitizeChangeEvent(event: EnhancedChangeEvent): EnhancedChangeEvent {
    return {
        ...event,
        content: undefined // Remove content for privacy
    };
}

/**
 * Sanitizes an array of change events
 */
export function sanitizeChangeEvents(events: EnhancedChangeEvent[]): EnhancedChangeEvent[] {
    return events.map(sanitizeChangeEvent);
}

/**
 * Filters change events by time range
 */
export function filterChangeEventsByTimeRange(
    events: EnhancedChangeEvent[],
    startTime: number,
    endTime: number
): EnhancedChangeEvent[] {
    return events.filter(event =>
        event.timestamp >= startTime && event.timestamp <= endTime
    );
}

/**
 * Filters change events by file URI
 */
export function filterChangeEventsByFile(
    events: EnhancedChangeEvent[],
    fileUri: string
): EnhancedChangeEvent[] {
    return events.filter(event => event.fileUri === fileUri);
}

/**
 * Groups change events by session ID
 */
export function groupChangeEventsBySession(
    events: EnhancedChangeEvent[]
): Map<string, EnhancedChangeEvent[]> {
    const groups = new Map<string, EnhancedChangeEvent[]>();

    for (const event of events) {
        const existing = groups.get(event.sessionId) || [];
        existing.push(event);
        groups.set(event.sessionId, existing);
    }

    return groups;
}

/**
 * Groups change events by file URI
 */
export function groupChangeEventsByFile(
    events: EnhancedChangeEvent[]
): Map<string, EnhancedChangeEvent[]> {
    const groups = new Map<string, EnhancedChangeEvent[]>();

    for (const event of events) {
        const existing = groups.get(event.fileUri) || [];
        existing.push(event);
        groups.set(event.fileUri, existing);
    }

    return groups;
}
