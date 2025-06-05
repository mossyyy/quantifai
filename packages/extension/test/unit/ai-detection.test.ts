import { AIDetectionService } from '../../src/services/AIDetectionService';
import { MetricsLogger } from '../../src/services/MetricsLogger';
import { ChangeEventGenerator, CODE_SAMPLES } from '../fixtures/change-events';

// Mock the MetricsLogger
jest.mock('../../src/services/MetricsLogger');

describe('AI Detection Service', () => {
    let aiDetector: AIDetectionService;
    let mockLogger: jest.Mocked<MetricsLogger>;

    beforeEach(() => {
        mockLogger = new MetricsLogger('/mock/workspace') as jest.Mocked<MetricsLogger>;
        mockLogger.logAIDetectionMetrics = jest.fn().mockResolvedValue(undefined);
        aiDetector = new AIDetectionService(mockLogger, 'test-session');
    });

    describe('Human typing detection', () => {
        test('detects human typing patterns correctly', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('console.log("hello");');
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('human');
            expect(result.aiProbability).toBeLessThan(0.3);
            expect(result.confidence).toBeGreaterThan(0.5);
            expect(result.evidence.bulkChangePattern).toBe(false);
            expect(result.evidence.externalToolSignature).toBe(false);
        });

        test('handles empty input gracefully', async () => {
            const result = await aiDetector.analyze([]);

            expect(result.source).toBe('human');
            expect(result.aiProbability).toBe(0);
            expect(result.confidence).toBe(0);
        });
    });

    describe('AI paste detection', () => {
        test('detects bulk paste as AI-generated', async () => {
            const events = ChangeEventGenerator.generateAIPaste(CODE_SAMPLES.SIMPLE_FUNCTION);
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('ai-generated');
            expect(result.aiProbability).toBeGreaterThan(0.7);
            expect(result.evidence.bulkChangePattern).toBe(true);
            expect(result.evidence.externalToolSignature).toBe(true);
        });

        test('detects complex code blocks as AI-generated', async () => {
            const events = ChangeEventGenerator.generateAIPaste(CODE_SAMPLES.COMPLEX_CLASS);
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('ai-generated');
            expect(result.aiProbability).toBeGreaterThan(0.8);
            expect(result.evidence.contentCharacteristics).toContain('contains-code-blocks');
            expect(result.evidence.contentCharacteristics).toContain('contains-classes');
        });
    });

    describe('Claude Code session detection', () => {
        test('detects Claude Code patterns', async () => {
            const changes = [
                'class Calculator {',
                '    add(a: number, b: number): number {',
                '        return a + b;',
                '    }',
                '}'
            ];
            const events = ChangeEventGenerator.generateClaudeCodeSession(changes);
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('ai-generated');
            expect(result.aiProbability).toBeGreaterThan(0.8);
            expect(result.evidence.externalToolSignature).toBe(true);
            expect(result.timeline.externalEvents).toHaveLength(5);
        });

        test('identifies timing anomalies in external tool usage', async () => {
            const changes = ['// First change', '// Second change'];
            const events = ChangeEventGenerator.generateClaudeCodeSession(changes);
            const result = await aiDetector.analyze(events);

            expect(result.evidence.timingAnomalies).toBe(true);
            expect(result.timeline.gaps).toHaveLength(0); // No gaps within the session
        });
    });

    describe('Mixed session detection', () => {
        test('detects mixed AI and human patterns', async () => {
            const events = ChangeEventGenerator.generateMixedSession();
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('mixed');
            expect(result.aiProbability).toBeGreaterThan(0.3);
            expect(result.aiProbability).toBeLessThan(0.9);
            expect(result.evidence.externalToolSignature).toBe(true);
        });
    });

    describe('Content pattern analysis', () => {
        test('identifies comment-heavy code patterns', async () => {
            const events = ChangeEventGenerator.generateAIPaste(CODE_SAMPLES.COMMENT_HEAVY);
            const result = await aiDetector.analyze(events);

            expect(result.evidence.contentCharacteristics).toContain('contains-comments');
            expect(result.evidence.contentCharacteristics).toContain('contains-functions');
        });

        test('analyzes React component patterns', async () => {
            const events = ChangeEventGenerator.generateAIPaste(CODE_SAMPLES.REACT_COMPONENT);
            const result = await aiDetector.analyze(events);

            expect(result.evidence.contentCharacteristics).toContain('contains-functions');
            expect(result.source).toBe('ai-generated');
        });
    });

    describe('Heuristic scoring', () => {
        test('bulk insertion heuristic works correctly', async () => {
            const largeCode = 'x'.repeat(500); // Large insertion
            const events = ChangeEventGenerator.generateAIPaste(largeCode);
            const result = await aiDetector.analyze(events);

            expect(result.evidence.bulkChangePattern).toBe(true);
            expect(result.aiProbability).toBeGreaterThan(0.5);
        });

        test('typing speed heuristic detects unrealistic speeds', async () => {
            const events = ChangeEventGenerator.generateAIPaste('fast typing simulation');
            // Modify to simulate very fast typing
            events[0].instantTypingSpeed = 500; // 500 CPM is unrealistic

            const result = await aiDetector.analyze(events);
            expect(result.aiProbability).toBeGreaterThan(0.3);
        });
    });

    describe('Confidence calculation', () => {
        test('provides high confidence for clear AI patterns', async () => {
            const events = ChangeEventGenerator.generateAIPaste(CODE_SAMPLES.COMPLEX_CLASS);
            const result = await aiDetector.analyze(events);

            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('provides high confidence for clear human patterns', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('hello world');
            const result = await aiDetector.analyze(events);

            expect(result.confidence).toBeGreaterThan(0.7);
        });
    });

    describe('Logging integration', () => {
        test('logs analysis metrics correctly', async () => {
            const events = ChangeEventGenerator.generateAIPaste(CODE_SAMPLES.SIMPLE_FUNCTION);
            await aiDetector.analyze(events);

            expect(mockLogger.logAIDetectionMetrics).toHaveBeenCalledTimes(1);
            const loggedMetrics = (mockLogger.logAIDetectionMetrics as jest.Mock).mock.calls[0][0];

            expect(loggedMetrics).toHaveProperty('timestamp');
            expect(loggedMetrics).toHaveProperty('sessionId', 'test-session');
            expect(loggedMetrics).toHaveProperty('heuristicScores');
            expect(loggedMetrics).toHaveProperty('finalConfidence');
            expect(loggedMetrics).toHaveProperty('decisionTrace');
        });

        test('includes decision trace in logs', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('test');
            await aiDetector.analyze(events);

            const loggedMetrics = (mockLogger.logAIDetectionMetrics as jest.Mock).mock.calls[0][0];
            expect(loggedMetrics.decisionTrace).toBeInstanceOf(Array);
            expect(loggedMetrics.decisionTrace.length).toBeGreaterThan(0);

            // Check that decision trace contains expected steps
            const traceSteps = loggedMetrics.decisionTrace.map((step: any) => step.step);
            expect(traceSteps).toContain('bulk-insertion-analysis');
            expect(traceSteps).toContain('typing-speed-analysis');
            expect(traceSteps).toContain('final-decision');
        });
    });

    describe('Edge cases', () => {
        test('handles single character changes', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('a');
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('human');
            expect(result.confidence).toBeGreaterThan(0);
        });

        test('handles whitespace-only changes', async () => {
            const events = ChangeEventGenerator.generateAIPaste('   \n   \t   ');
            const result = await aiDetector.analyze(events);

            expect(result.evidence.contentCharacteristics).toHaveLength(0);
            expect(result.aiProbability).toBeGreaterThan(0); // Still detected as AI due to bulk paste
        });

        test('handles very long content', async () => {
            const longContent = 'x'.repeat(10000);
            const events = ChangeEventGenerator.generateAIPaste(longContent);
            const result = await aiDetector.analyze(events);

            expect(result.source).toBe('ai-generated');
            expect(result.evidence.bulkChangePattern).toBe(true);
        });
    });

    describe('Session ID updates', () => {
        test('updates session ID correctly', () => {
            const newSessionId = 'new-session-id';
            aiDetector.updateSessionId(newSessionId);

            // This would be tested by checking the logged metrics in the next analysis
            expect(() => aiDetector.updateSessionId(newSessionId)).not.toThrow();
        });
    });
});
