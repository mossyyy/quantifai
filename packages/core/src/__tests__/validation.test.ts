import {
    validateChangeEvent,
    validateAIDetectionConfig,
    sanitizeChangeEvent,
    filterChangeEventsByTimeRange,
    filterChangeEventsByFile,
    groupChangeEventsBySession
} from '../utils/validation';
import type { EnhancedChangeEvent, AIDetectionConfig } from '../types';

describe('validation utilities', () => {
    const validChangeEvent: EnhancedChangeEvent = {
        timestamp: Date.now(),
        sessionId: 'test-session',
        fileUri: 'test://file.ts',
        eventId: 'test-event',
        changeType: 'insert',
        position: { line: 1, character: 0 },
        contentLength: 50,
        timeSinceLastChange: 1000,
        timeSinceSessionStart: 5000,
        timeSinceFileOpen: 10000,
        source: 'live',
        vsCodeActive: true,
        cursorPosition: { line: 1, character: 0 },
        instantTypingSpeed: 150,
        rollingTypingSpeed: 140,
        burstDetected: false,
        pauseBeforeChange: 100,
        isCodeBlock: false,
        isComment: false,
        isWhitespace: false,
        languageConstruct: 'function',
        indentationLevel: 2
    };

    const validConfig: AIDetectionConfig = {
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

    describe('validateChangeEvent', () => {
        it('should validate a correct change event', () => {
            expect(validateChangeEvent(validChangeEvent)).toBe(true);
        });

        it('should reject null or undefined', () => {
            expect(validateChangeEvent(null)).toBe(false);
            expect(validateChangeEvent(undefined)).toBe(false);
        });

        it('should reject events with missing required fields', () => {
            const invalidEvent = { ...validChangeEvent };
            delete (invalidEvent as any).timestamp;
            expect(validateChangeEvent(invalidEvent)).toBe(false);
        });

        it('should reject events with wrong field types', () => {
            const invalidEvent = { ...validChangeEvent, timestamp: 'not-a-number' };
            expect(validateChangeEvent(invalidEvent)).toBe(false);
        });

        it('should reject events with invalid changeType', () => {
            const invalidEvent = { ...validChangeEvent, changeType: 'invalid' as any };
            expect(validateChangeEvent(invalidEvent)).toBe(false);
        });

        it('should reject events with invalid source', () => {
            const invalidEvent = { ...validChangeEvent, source: 'invalid' as any };
            expect(validateChangeEvent(invalidEvent)).toBe(false);
        });
    });

    describe('validateAIDetectionConfig', () => {
        it('should validate a correct config', () => {
            expect(validateAIDetectionConfig(validConfig)).toBe(true);
        });

        it('should reject null or undefined', () => {
            expect(validateAIDetectionConfig(null)).toBe(false);
            expect(validateAIDetectionConfig(undefined)).toBe(false);
        });

        it('should reject config with missing weights', () => {
            const invalidConfig = { ...validConfig };
            delete (invalidConfig as any).weights;
            expect(validateAIDetectionConfig(invalidConfig)).toBe(false);
        });

        it('should reject config with invalid weight values', () => {
            const invalidConfig = {
                ...validConfig,
                weights: { ...validConfig.weights, bulkInsertionScore: 1.5 }
            };
            expect(validateAIDetectionConfig(invalidConfig)).toBe(false);
        });

        it('should reject config with negative thresholds', () => {
            const invalidConfig = {
                ...validConfig,
                thresholds: { ...validConfig.thresholds, bulkInsertionSize: -1 }
            };
            expect(validateAIDetectionConfig(invalidConfig)).toBe(false);
        });

        it('should reject config with invalid classification order', () => {
            const invalidConfig = {
                ...validConfig,
                classification: {
                    humanThreshold: 0.8,
                    aiAssistedThreshold: 0.6,
                    aiGeneratedThreshold: 0.3
                }
            };
            expect(validateAIDetectionConfig(invalidConfig)).toBe(false);
        });
    });

    describe('sanitizeChangeEvent', () => {
        it('should remove content field', () => {
            const eventWithContent = { ...validChangeEvent, content: 'sensitive content' };
            const sanitized = sanitizeChangeEvent(eventWithContent);

            expect(sanitized.content).toBeUndefined();
            expect(sanitized.timestamp).toBe(eventWithContent.timestamp);
            expect(sanitized.sessionId).toBe(eventWithContent.sessionId);
        });

        it('should preserve all other fields', () => {
            const sanitized = sanitizeChangeEvent(validChangeEvent);

            expect(sanitized.timestamp).toBe(validChangeEvent.timestamp);
            expect(sanitized.sessionId).toBe(validChangeEvent.sessionId);
            expect(sanitized.fileUri).toBe(validChangeEvent.fileUri);
            expect(sanitized.contentLength).toBe(validChangeEvent.contentLength);
        });
    });

    describe('filterChangeEventsByTimeRange', () => {
        const events: EnhancedChangeEvent[] = [
            { ...validChangeEvent, timestamp: 1000 },
            { ...validChangeEvent, timestamp: 2000 },
            { ...validChangeEvent, timestamp: 3000 },
            { ...validChangeEvent, timestamp: 4000 }
        ];

        it('should filter events within time range', () => {
            const filtered = filterChangeEventsByTimeRange(events, 1500, 3500);
            expect(filtered).toHaveLength(2);
            expect(filtered[0].timestamp).toBe(2000);
            expect(filtered[1].timestamp).toBe(3000);
        });

        it('should return empty array for no matches', () => {
            const filtered = filterChangeEventsByTimeRange(events, 5000, 6000);
            expect(filtered).toHaveLength(0);
        });

        it('should include boundary values', () => {
            const filtered = filterChangeEventsByTimeRange(events, 2000, 3000);
            expect(filtered).toHaveLength(2);
            expect(filtered[0].timestamp).toBe(2000);
            expect(filtered[1].timestamp).toBe(3000);
        });
    });

    describe('filterChangeEventsByFile', () => {
        const events: EnhancedChangeEvent[] = [
            { ...validChangeEvent, fileUri: 'file1.ts' },
            { ...validChangeEvent, fileUri: 'file2.ts' },
            { ...validChangeEvent, fileUri: 'file1.ts' },
            { ...validChangeEvent, fileUri: 'file3.ts' }
        ];

        it('should filter events by file URI', () => {
            const filtered = filterChangeEventsByFile(events, 'file1.ts');
            expect(filtered).toHaveLength(2);
            expect(filtered.every(e => e.fileUri === 'file1.ts')).toBe(true);
        });

        it('should return empty array for non-existent file', () => {
            const filtered = filterChangeEventsByFile(events, 'nonexistent.ts');
            expect(filtered).toHaveLength(0);
        });
    });

    describe('groupChangeEventsBySession', () => {
        const events: EnhancedChangeEvent[] = [
            { ...validChangeEvent, sessionId: 'session1' },
            { ...validChangeEvent, sessionId: 'session2' },
            { ...validChangeEvent, sessionId: 'session1' },
            { ...validChangeEvent, sessionId: 'session3' }
        ];

        it('should group events by session ID', () => {
            const grouped = groupChangeEventsBySession(events);

            expect(grouped.size).toBe(3);
            expect(grouped.get('session1')).toHaveLength(2);
            expect(grouped.get('session2')).toHaveLength(1);
            expect(grouped.get('session3')).toHaveLength(1);
        });

        it('should handle empty input', () => {
            const grouped = groupChangeEventsBySession([]);
            expect(grouped.size).toBe(0);
        });
    });
});
