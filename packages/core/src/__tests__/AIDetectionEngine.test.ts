import { AIDetectionEngine, DEFAULT_AI_DETECTION_CONFIG } from '../services/AIDetectionEngine';
import type { EnhancedChangeEvent } from '../types/ChangeEvent';

describe('AIDetectionEngine', () => {
    let engine: AIDetectionEngine;

    beforeEach(() => {
        engine = new AIDetectionEngine();
    });

    describe('constructor and configuration', () => {
        it('should initialize with default configuration', () => {
            const config = engine.getConfig();
            expect(config).toEqual(DEFAULT_AI_DETECTION_CONFIG);
        });

        it('should allow configuration updates', () => {
            const newWeights = {
                bulkInsertionScore: 0.5,
                typingSpeedScore: 0.3,
                pastePatternScore: 0.1,
                externalToolScore: 0.1,
                contentPatternScore: 0.0,
                timingAnomalyScore: 0.0
            };

            engine.updateConfig({ weights: newWeights });
            const config = engine.getConfig();
            expect(config.weights).toEqual(newWeights);
        });
    });

    describe('analyze', () => {
        it('should return empty attribution for empty input', () => {
            const result = engine.analyze([]);

            expect(result.source).toBe('human');
            expect(result.confidence).toBe(0);
            expect(result.aiProbability).toBe(0);
            expect(result.evidence.bulkChanges).toHaveLength(0);
            expect(result.evidence.typingBursts).toHaveLength(0);
        });

        it('should return valid analysis structure', () => {
            const changes: EnhancedChangeEvent[] = [
                createMockChangeEvent({
                    contentLength: 100,
                    instantTypingSpeed: 200,
                    timeSinceLastChange: 500,
                    isCodeBlock: true
                })
            ];

            const result = engine.analyze(changes);

            // Test structure without asserting specific classification
            expect(result).toHaveProperty('source');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('aiProbability');
            expect(result).toHaveProperty('evidence');
            expect(result).toHaveProperty('timeline');
            expect(['human', 'ai-assisted', 'ai-generated', 'mixed']).toContain(result.source);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(result.aiProbability).toBeGreaterThanOrEqual(0);
            expect(result.aiProbability).toBeLessThanOrEqual(1);
        });

        it('should detect bulk insertion patterns', () => {
            const bulkChanges: EnhancedChangeEvent[] = [
                createMockChangeEvent({
                    contentLength: 200, // Above bulk threshold
                    changeType: 'insert',
                    timeSinceLastChange: 50,
                    isCodeBlock: true
                }),
                createMockChangeEvent({
                    contentLength: 300, // Above bulk threshold
                    changeType: 'insert',
                    timeSinceLastChange: 40,
                    isCodeBlock: true
                })
            ];

            const result = engine.analyze(bulkChanges);

            expect(result.evidence.bulkChangePattern).toBe(true);
            expect(result.evidence.bulkChanges.length).toBeGreaterThan(0);
        });
    });

    describe('configuration validation', () => {
        it('should handle invalid configurations gracefully', () => {
            // This should not throw
            expect(() => {
                engine.updateConfig({
                    weights: {
                        bulkInsertionScore: 1.0,
                        typingSpeedScore: 0.0,
                        pastePatternScore: 0.0,
                        externalToolScore: 0.0,
                        contentPatternScore: 0.0,
                        timingAnomalyScore: 0.0
                    }
                });
            }).not.toThrow();
        });
    });
});

// Helper function to create mock change events
function createMockChangeEvent(overrides: Partial<EnhancedChangeEvent> = {}): EnhancedChangeEvent {
    return {
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
    };
}
