import {
    calculateStatistics,
    calculateTypingSpeedStats,
    calculateContentLengthStats,
    calculateTimeGapStats,
    calculateTimeSpan,
    calculateTotalContentLength,
    calculatePercentage,
    calculateEventRate,
    calculateAverageTypingSpeed,
    findOutliers,
    calculateRollingAverage,
    normalizeValues,
    calculateCorrelation
} from '../utils/calculations';
import type { EnhancedChangeEvent } from '../types/ChangeEvent';

describe('calculation utilities', () => {
    const createMockEvent = (overrides: Partial<EnhancedChangeEvent> = {}): EnhancedChangeEvent => ({
        timestamp: Date.now(),
        sessionId: 'test-session',
        fileUri: 'test://file.ts',
        eventId: 'test-event-' + Math.random(),
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
        languageConstruct: 'unknown',
        indentationLevel: 0,
        ...overrides
    });

    describe('calculateStatistics', () => {
        it('should calculate correct statistics for a simple array', () => {
            const values = [1, 2, 3, 4, 5];
            const stats = calculateStatistics(values);

            expect(stats.mean).toBe(3);
            expect(stats.median).toBe(3);
            expect(stats.min).toBe(1);
            expect(stats.max).toBe(5);
            expect(stats.count).toBe(5);
            expect(stats.stdDev).toBeCloseTo(1.41, 1);
        });

        it('should handle empty array', () => {
            const stats = calculateStatistics([]);

            expect(stats.mean).toBe(0);
            expect(stats.median).toBe(0);
            expect(stats.min).toBe(0);
            expect(stats.max).toBe(0);
            expect(stats.count).toBe(0);
            expect(stats.stdDev).toBe(0);
        });

        it('should calculate median correctly for even number of elements', () => {
            const values = [1, 2, 3, 4];
            const stats = calculateStatistics(values);

            expect(stats.median).toBe(2.5);
        });

        it('should calculate median correctly for odd number of elements', () => {
            const values = [1, 2, 3, 4, 5];
            const stats = calculateStatistics(values);

            expect(stats.median).toBe(3);
        });
    });

    describe('calculateTypingSpeedStats', () => {
        it('should calculate typing speed statistics', () => {
            const events = [
                createMockEvent({ instantTypingSpeed: 100 }),
                createMockEvent({ instantTypingSpeed: 200 }),
                createMockEvent({ instantTypingSpeed: 0 }), // Should be filtered out
                createMockEvent({ instantTypingSpeed: 300 })
            ];

            const stats = calculateTypingSpeedStats(events);

            expect(stats.count).toBe(3); // Zero speed filtered out
            expect(stats.mean).toBe(200);
            expect(stats.min).toBe(100);
            expect(stats.max).toBe(300);
        });

        it('should handle events with no typing speed data', () => {
            const events = [
                createMockEvent({ instantTypingSpeed: 0 }),
                createMockEvent({ instantTypingSpeed: 0 })
            ];

            const stats = calculateTypingSpeedStats(events);

            expect(stats.count).toBe(0);
            expect(stats.mean).toBe(0);
        });
    });

    describe('calculateContentLengthStats', () => {
        it('should calculate content length statistics', () => {
            const events = [
                createMockEvent({ contentLength: 10 }),
                createMockEvent({ contentLength: 20 }),
                createMockEvent({ contentLength: 30 })
            ];

            const stats = calculateContentLengthStats(events);

            expect(stats.count).toBe(3);
            expect(stats.mean).toBe(20);
            expect(stats.min).toBe(10);
            expect(stats.max).toBe(30);
        });
    });

    describe('calculateTimeGapStats', () => {
        it('should calculate time gaps between events', () => {
            const events = [
                createMockEvent({ timestamp: 1000 }),
                createMockEvent({ timestamp: 2000 }),
                createMockEvent({ timestamp: 4000 })
            ];

            const stats = calculateTimeGapStats(events);

            expect(stats.count).toBe(2); // n-1 gaps for n events
            expect(stats.mean).toBe(1500); // (1000 + 2000) / 2
            expect(stats.min).toBe(1000);
            expect(stats.max).toBe(2000);
        });

        it('should handle single event', () => {
            const events = [createMockEvent()];
            const stats = calculateTimeGapStats(events);

            expect(stats.count).toBe(0);
        });
    });

    describe('calculateTimeSpan', () => {
        it('should calculate total time span', () => {
            const events = [
                createMockEvent({ timestamp: 1000 }),
                createMockEvent({ timestamp: 3000 }),
                createMockEvent({ timestamp: 2000 }) // Out of order
            ];

            const timeSpan = calculateTimeSpan(events);

            expect(timeSpan).toBe(2000); // 3000 - 1000
        });

        it('should return 0 for single event', () => {
            const events = [createMockEvent()];
            expect(calculateTimeSpan(events)).toBe(0);
        });

        it('should return 0 for empty array', () => {
            expect(calculateTimeSpan([])).toBe(0);
        });
    });

    describe('calculateTotalContentLength', () => {
        it('should sum all content lengths', () => {
            const events = [
                createMockEvent({ contentLength: 10 }),
                createMockEvent({ contentLength: 20 }),
                createMockEvent({ contentLength: 30 })
            ];

            const total = calculateTotalContentLength(events);

            expect(total).toBe(60);
        });

        it('should return 0 for empty array', () => {
            expect(calculateTotalContentLength([])).toBe(0);
        });
    });

    describe('calculatePercentage', () => {
        it('should calculate percentage correctly', () => {
            const items = [1, 2, 3, 4, 5];
            const percentage = calculatePercentage(items, x => x > 3);

            expect(percentage).toBe(40); // 2 out of 5 = 40%
        });

        it('should return 0 for empty array', () => {
            const percentage = calculatePercentage([], () => true);
            expect(percentage).toBe(0);
        });

        it('should return 0 when no items match', () => {
            const items = [1, 2, 3];
            const percentage = calculatePercentage(items, x => x > 10);

            expect(percentage).toBe(0);
        });
    });

    describe('calculateEventRate', () => {
        it('should calculate events per minute', () => {
            const events = [
                createMockEvent({ timestamp: 0 }),
                createMockEvent({ timestamp: 30000 }), // 30 seconds later
                createMockEvent({ timestamp: 60000 })  // 60 seconds from start
            ];

            const rate = calculateEventRate(events);

            expect(rate).toBe(3); // 3 events in 1 minute
        });

        it('should return 0 for single event', () => {
            const events = [createMockEvent()];
            expect(calculateEventRate(events)).toBe(0);
        });
    });

    describe('calculateAverageTypingSpeed', () => {
        it('should calculate average typing speed', () => {
            const events = [
                createMockEvent({ instantTypingSpeed: 100 }),
                createMockEvent({ instantTypingSpeed: 200 }),
                createMockEvent({ instantTypingSpeed: 0 }), // Should be filtered out
                createMockEvent({ instantTypingSpeed: 300 })
            ];

            const avgSpeed = calculateAverageTypingSpeed(events);

            expect(avgSpeed).toBe(200); // (100 + 200 + 300) / 3
        });

        it('should return 0 when no typing speed data', () => {
            const events = [
                createMockEvent({ instantTypingSpeed: 0 }),
                createMockEvent({ instantTypingSpeed: 0 })
            ];

            expect(calculateAverageTypingSpeed(events)).toBe(0);
        });
    });

    describe('findOutliers', () => {
        it('should find outliers using IQR method', () => {
            const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is an outlier
            const result = findOutliers(values);

            expect(result.outliers).toContain(100);
            expect(result.q1).toBeGreaterThan(0);
            expect(result.q3).toBeGreaterThan(result.q1);
            expect(result.iqr).toBe(result.q3 - result.q1);
        });

        it('should handle small arrays', () => {
            const values = [1, 2];
            const result = findOutliers(values);

            expect(result.outliers).toHaveLength(0);
            expect(result.q1).toBe(0);
            expect(result.q3).toBe(0);
        });
    });

    describe('calculateRollingAverage', () => {
        it('should calculate rolling average', () => {
            const values = [1, 2, 3, 4, 5];
            const rolling = calculateRollingAverage(values, 3);

            expect(rolling[0]).toBe(1); // [1]
            expect(rolling[1]).toBe(1.5); // [1, 2]
            expect(rolling[2]).toBe(2); // [1, 2, 3]
            expect(rolling[3]).toBe(3); // [2, 3, 4]
            expect(rolling[4]).toBe(4); // [3, 4, 5]
        });

        it('should handle window size larger than array', () => {
            const values = [1, 2, 3];
            const rolling = calculateRollingAverage(values, 5);

            expect(rolling).toEqual([1, 2, 3]);
        });
    });

    describe('normalizeValues', () => {
        it('should normalize values to 0-1 range', () => {
            const values = [10, 20, 30, 40, 50];
            const normalized = normalizeValues(values);

            expect(normalized[0]).toBe(0); // min value
            expect(normalized[4]).toBe(1); // max value
            expect(normalized[2]).toBe(0.5); // middle value
        });

        it('should handle identical values', () => {
            const values = [5, 5, 5, 5];
            const normalized = normalizeValues(values);

            expect(normalized).toEqual([0, 0, 0, 0]);
        });

        it('should handle empty array', () => {
            const normalized = normalizeValues([]);
            expect(normalized).toEqual([]);
        });
    });

    describe('calculateCorrelation', () => {
        it('should calculate perfect positive correlation', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [2, 4, 6, 8, 10]; // y = 2x

            const correlation = calculateCorrelation(x, y);

            expect(correlation).toBeCloseTo(1, 5);
        });

        it('should calculate perfect negative correlation', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [5, 4, 3, 2, 1]; // inverse relationship

            const correlation = calculateCorrelation(x, y);

            expect(correlation).toBeCloseTo(-1, 5);
        });

        it('should return 0 for no correlation', () => {
            const x = [1, 2, 3, 4, 5];
            const y = [1, 1, 1, 1, 1]; // constant

            const correlation = calculateCorrelation(x, y);

            expect(correlation).toBe(0);
        });

        it('should handle mismatched array lengths', () => {
            const x = [1, 2, 3];
            const y = [1, 2];

            const correlation = calculateCorrelation(x, y);

            expect(correlation).toBe(0);
        });

        it('should handle empty arrays', () => {
            const correlation = calculateCorrelation([], []);
            expect(correlation).toBe(0);
        });
    });
});
