import { ReviewAnalyzer } from '../../src/services/ReviewAnalyzer';
import { MetricsLogger } from '../../src/services/MetricsLogger';
import { ChangeEventGenerator } from '../fixtures/change-events';

// Mock the MetricsLogger
jest.mock('../../src/services/MetricsLogger');

describe('Review Analyzer', () => {
    let reviewAnalyzer: ReviewAnalyzer;
    let mockLogger: jest.Mocked<MetricsLogger>;

    beforeEach(() => {
        mockLogger = new MetricsLogger('/mock/workspace') as jest.Mocked<MetricsLogger>;
        mockLogger.logReviewQualityMetrics = jest.fn().mockResolvedValue(undefined);
        mockLogger.getChangeEventsForFile = jest.fn().mockResolvedValue([]);
        reviewAnalyzer = new ReviewAnalyzer(mockLogger, 'test-session');
    });

    describe('Immediate commit detection', () => {
        test('scores immediate commit low', async () => {
            const events = ChangeEventGenerator.generateAIPaste('const x = 5;');
            const commitTime = events[0].timestamp + 1000; // 1 second after change

            const result = await reviewAnalyzer.assessQuality(events, { commitTime });

            expect(result.overallScore).toBeLessThan(3);
            expect(result.qualityLevel).toBe('immediate-commit');
            expect(result.patterns.immediateCommit).toBe(true);
            expect(result.patterns.multiSessionReview).toBe(false);
        });

        test('handles empty changes gracefully', async () => {
            const result = await reviewAnalyzer.assessQuality([]);

            expect(result.overallScore).toBe(0);
            expect(result.qualityLevel).toBe('immediate-commit');
            expect(result.confidence).toBe(1.0);
        });
    });

    describe('Multi-session review detection', () => {
        test('scores multi-session review high', async () => {
            const events = ChangeEventGenerator.generateReviewSession();
            const commitTime = events[events.length - 1].timestamp + 600000; // 10 minutes after last change

            const result = await reviewAnalyzer.assessQuality(events, { commitTime });

            expect(result.overallScore).toBeGreaterThan(6);
            expect(result.qualityLevel).toBe('thorough-review');
            expect(result.patterns.multiSessionReview).toBe(false); // Single session with long pause
            expect(result.patterns.pausesForReflection).toBe(true);
        });

        test('identifies multiple edit sessions correctly', async () => {
            const events = ChangeEventGenerator.generateMixedSession();

            // Simulate multiple sessions by adding large time gaps
            const sessionGap = 35 * 60 * 1000; // 35 minutes (> 30 min threshold)
            for (let i = 1; i < events.length; i++) {
                if (i === Math.floor(events.length / 2)) {
                    events[i].timestamp = events[i - 1].timestamp + sessionGap;
                    events[i].timeSinceLastChange = sessionGap;
                }
            }

            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.patterns.multipleEditSessions).toBe(true);
            expect(result.breakdown.iterationCount).toBeGreaterThan(1);
        });
    });

    describe('Review pattern analysis', () => {
        test('detects incremental refinement patterns', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('const x = 1;');

            // Add refinement changes with pauses
            const refinements = [
                'const result = 1;', // Variable rename
                '// Added comment', // Comment addition
                'const result: number = 1;' // Type annotation
            ];

            let lastTimestamp = events[events.length - 1].timestamp;
            refinements.forEach((refinement, index) => {
                lastTimestamp += 10000; // 10 second gaps
                events.push({
                    ...events[0],
                    timestamp: lastTimestamp,
                    eventId: `refinement-${index}`,
                    content: refinement,
                    contentLength: refinement.length,
                    timeSinceLastChange: 10000,
                    changeType: 'replace'
                });
            });

            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.patterns.incrementalRefinement).toBe(true);
            expect(result.breakdown.refinementScore).toBeGreaterThan(0);
        });

        test('identifies comment additions', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('function test() {}');

            // Add comment
            const commentEvent = {
                ...events[0],
                timestamp: events[events.length - 1].timestamp + 5000,
                eventId: 'comment-addition',
                content: '// This function does testing',
                isComment: true,
                timeSinceLastChange: 5000
            };
            events.push(commentEvent);

            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.patterns.commentaryAdded).toBe(true);
            expect(result.breakdown.refinementScore).toBeGreaterThan(0);
        });

        test('detects code restructuring', async () => {
            const events = ChangeEventGenerator.generateAIPaste('function old() { return 1; }');

            // Add restructuring change
            const restructureEvent = {
                ...events[0],
                timestamp: events[0].timestamp + 60000, // 1 minute later
                eventId: 'restructure',
                content: 'const newFunction = () => 1;',
                contentLength: 25,
                changeType: 'replace' as const,
                languageConstruct: 'variable',
                timeSinceLastChange: 60000
            };
            events.push(restructureEvent);

            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.patterns.codeRestructuring).toBe(true);
        });
    });

    describe('Time-based scoring', () => {
        test('rewards time investment', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('test code');

            // Extend development time
            const extendedEvents = events.map((event, index) => ({
                ...event,
                timestamp: event.timestamp + (index * 60000) // 1 minute between each character
            }));

            const result = await reviewAnalyzer.assessQuality(extendedEvents);

            expect(result.breakdown.timeInvestmentScore).toBeGreaterThan(0);
            expect(result.breakdown.timeInvestment).toBeGreaterThan(30 * 60 * 1000); // > 30 minutes
        });

        test('calculates development time correctly', async () => {
            const events = ChangeEventGenerator.generateReviewSession();
            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.breakdown.timeInvestment).toBeGreaterThan(0);
            expect(result.evidence.editTimeline).toHaveLength(events.length);
        });
    });

    describe('Edit pattern analysis', () => {
        test('categorizes edit types correctly', async () => {
            const events = [
                // Small incremental edit
                {
                    ...ChangeEventGenerator.generateHumanTyping('x')[0],
                    contentLength: 1,
                    changeType: 'insert' as const
                },
                // Bulk replacement
                {
                    ...ChangeEventGenerator.generateAIPaste('large code block')[0],
                    contentLength: 150,
                    changeType: 'replace' as const
                },
                // Comment addition
                {
                    ...ChangeEventGenerator.generateHumanTyping('// comment')[0],
                    isComment: true
                }
            ];

            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.breakdown.iterationCount).toBe(1); // Single session
        });

        test('identifies variable renames', async () => {
            const events = ChangeEventGenerator.generateHumanTyping('oldName');

            // Add rename
            const renameEvent = {
                ...events[0],
                timestamp: events[0].timestamp + 5000,
                eventId: 'rename',
                content: 'newName',
                contentLength: 7,
                changeType: 'replace' as const,
                timeSinceLastChange: 5000
            };
            events.push(renameEvent);

            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.breakdown.refinementScore).toBeGreaterThan(0);
        });
    });

    describe('Quality level determination', () => {
        test('assigns correct quality levels', async () => {
            // Test immediate commit (score <= 2)
            const immediateEvents = ChangeEventGenerator.generateAIPaste('quick');
            const immediateResult = await reviewAnalyzer.assessQuality(immediateEvents);
            expect(immediateResult.qualityLevel).toBe('immediate-commit');

            // Test light review (score 3-5)
            const lightEvents = ChangeEventGenerator.generateMixedSession();
            const lightResult = await reviewAnalyzer.assessQuality(lightEvents);
            expect(['light-review', 'thorough-review']).toContain(lightResult.qualityLevel);

            // Test thorough review (score 6-8)
            const thoroughEvents = ChangeEventGenerator.generateReviewSession();
            const thoroughResult = await reviewAnalyzer.assessQuality(thoroughEvents);
            expect(['thorough-review', 'extensive-review']).toContain(thoroughResult.qualityLevel);
        });
    });

    describe('Confidence calculation', () => {
        test('increases confidence with more data points', async () => {
            const smallDataset = ChangeEventGenerator.generateHumanTyping('hi');
            const largeDataset = ChangeEventGenerator.generateHumanTyping('this is a much longer piece of text with many characters');

            const smallResult = await reviewAnalyzer.assessQuality(smallDataset);
            const largeResult = await reviewAnalyzer.assessQuality(largeDataset);

            expect(largeResult.confidence).toBeGreaterThanOrEqual(smallResult.confidence);
        });

        test('provides higher confidence for extreme scores', async () => {
            // Very low score (immediate commit)
            const lowScoreEvents = ChangeEventGenerator.generateAIPaste('x');
            const lowResult = await reviewAnalyzer.assessQuality(lowScoreEvents);

            // Very high score (extensive review)
            const highScoreEvents = ChangeEventGenerator.generateReviewSession();
            const highResult = await reviewAnalyzer.assessQuality(highScoreEvents);

            expect(lowResult.confidence).toBeGreaterThan(0.7);
            expect(highResult.confidence).toBeGreaterThan(0.7);
        });
    });

    describe('Evidence extraction', () => {
        test('extracts edit timeline correctly', async () => {
            const events = ChangeEventGenerator.generateMixedSession();
            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.evidence.editTimeline).toHaveLength(events.length);
            expect(result.evidence.editTimeline[0]).toHaveProperty('timestamp');
            expect(result.evidence.editTimeline[0]).toHaveProperty('editType');
            expect(result.evidence.editTimeline[0]).toHaveProperty('significance');
        });

        test('analyzes pauses correctly', async () => {
            const events = ChangeEventGenerator.generateReviewSession();
            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.evidence.pauseAnalysis.length).toBeGreaterThan(0);
            expect(result.evidence.pauseAnalysis[0]).toHaveProperty('duration');
            expect(result.evidence.pauseAnalysis[0]).toHaveProperty('likelyActivity');
        });

        test('provides refinement examples', async () => {
            const events = ChangeEventGenerator.generateReviewSession();
            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.evidence.refinementExamples).toBeInstanceOf(Array);
        });
    });

    describe('Logging integration', () => {
        test('logs review metrics correctly', async () => {
            const events = ChangeEventGenerator.generateMixedSession();
            await reviewAnalyzer.assessQuality(events);

            expect(mockLogger.logReviewQualityMetrics).toHaveBeenCalledTimes(1);
            const loggedMetrics = (mockLogger.logReviewQualityMetrics as jest.Mock).mock.calls[0][0];

            expect(loggedMetrics).toHaveProperty('timestamp');
            expect(loggedMetrics).toHaveProperty('sessionId', 'test-session');
            expect(loggedMetrics).toHaveProperty('timeMetrics');
            expect(loggedMetrics).toHaveProperty('editPatterns');
            expect(loggedMetrics).toHaveProperty('scoreBreakdown');
        });
    });

    describe('File history analysis', () => {
        test('analyzes file history correctly', async () => {
            const mockEvents = ChangeEventGenerator.generateMixedSession().map(event => ({
                ...event,
                _loggedAt: Date.now(),
                _version: '1.0'
            }));
            mockLogger.getChangeEventsForFile.mockResolvedValue(mockEvents);

            const result = await reviewAnalyzer.analyzeFileHistory('test-file.ts');

            expect(mockLogger.getChangeEventsForFile).toHaveBeenCalledWith('test-file.ts', undefined);
            expect(result.overallScore).toBeGreaterThan(0);
        });

        test('handles file history with time filter', async () => {
            const fromTime = Date.now() - 86400000; // 24 hours ago
            await reviewAnalyzer.analyzeFileHistory('test-file.ts', fromTime);

            expect(mockLogger.getChangeEventsForFile).toHaveBeenCalledWith('test-file.ts', fromTime);
        });
    });

    describe('Session ID updates', () => {
        test('updates session ID correctly', () => {
            const newSessionId = 'new-session-id';
            reviewAnalyzer.updateSessionId(newSessionId);

            expect(() => reviewAnalyzer.updateSessionId(newSessionId)).not.toThrow();
        });
    });

    describe('Edge cases', () => {
        test('handles single change correctly', async () => {
            const events = [ChangeEventGenerator.generateHumanTyping('x')[0]];
            const result = await reviewAnalyzer.assessQuality(events);

            expect(result.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.qualityLevel).toBe('immediate-commit');
        });

        test('handles changes without commit info', async () => {
            const events = ChangeEventGenerator.generateMixedSession();
            const result = await reviewAnalyzer.assessQuality(events); // No commit info

            expect(result.breakdown.timeInvestment).toBeGreaterThan(0);
            expect(result.qualityLevel).toBeDefined();
        });
    });
});
