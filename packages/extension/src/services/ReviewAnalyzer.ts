import { v4 as uuidv4 } from 'uuid';
import {
    type EnhancedChangeEvent,
    type ReviewQualityAssessment,
    type ReviewQualityMetricsLog,
    type TimeMetrics,
    type EditPatterns,
    type ReviewIndicators,
    type ReviewScoreBreakdown,
    type ReviewPatterns,
    type ReviewEvidence
} from '@ai-analyzer/core';
import { MetricsLogger } from './MetricsLogger';

export class ReviewAnalyzer {
    private logger: MetricsLogger;
    private currentSessionId: string;

    constructor(logger: MetricsLogger, sessionId: string) {
        this.logger = logger;
        this.currentSessionId = sessionId;
    }

    async assessQuality(
        changes: EnhancedChangeEvent[],
        commitInfo?: { commitTime: number }
    ): Promise<ReviewQualityAssessment> {
        if (changes.length === 0) {
            return this.createEmptyAssessment();
        }

        const analysisId = uuidv4();
        const startTime = Date.now();

        // Calculate time-based metrics
        const timeMetrics = this.calculateTimeMetrics(changes, commitInfo);

        // Analyze edit patterns
        const editPatterns = this.analyzeEditPatterns(changes);

        // Identify review indicators
        const reviewIndicators = this.identifyReviewIndicators(changes, timeMetrics);

        // Calculate scoring breakdown
        const scoreBreakdown = this.calculateScoreBreakdown(timeMetrics, editPatterns, reviewIndicators);

        // Determine quality level and confidence
        const qualityLevel = this.determineQualityLevel(scoreBreakdown.finalScore);
        const confidence = this.calculateConfidence(changes, scoreBreakdown);

        // Extract evidence
        const evidence = this.extractEvidence(changes, timeMetrics);

        // Create patterns summary
        const patterns = this.createPatterns(reviewIndicators, timeMetrics, editPatterns);

        // Log comprehensive metrics
        await this.logReviewMetrics({
            timestamp: startTime,
            sessionId: this.currentSessionId,
            fileUri: changes[0]?.fileUri || '',
            analysisId,
            timeMetrics,
            editPatterns,
            reviewIndicators,
            scoreBreakdown,
            qualityLevel,
            confidence,
            evidence
        });

        return {
            overallScore: scoreBreakdown.finalScore,
            breakdown: scoreBreakdown,
            patterns,
            evidence,
            qualityLevel,
            confidence
        };
    }

    private calculateTimeMetrics(
        changes: EnhancedChangeEvent[],
        commitInfo?: { commitTime: number }
    ): TimeMetrics {
        if (changes.length === 0) {
            return {
                totalDevelopmentTime: 0,
                timeBeforeFirstCommit: 0,
                numberOfEditSessions: 0,
                averageSessionLength: 0,
                longestPauseBetweenEdits: 0,
                editingVelocityOverTime: []
            };
        }

        const firstChange = changes[0].timestamp;
        const lastChange = changes[changes.length - 1].timestamp;
        const totalDevelopmentTime = lastChange - firstChange;

        const timeBeforeFirstCommit = commitInfo
            ? commitInfo.commitTime - lastChange
            : 0;

        // Identify edit sessions (gaps > 30 minutes indicate new sessions)
        const sessionGapThreshold = 30 * 60 * 1000; // 30 minutes
        const sessions = this.identifyEditSessions(changes, sessionGapThreshold);

        const numberOfEditSessions = sessions.length;
        const averageSessionLength = sessions.length > 0
            ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length
            : 0;

        // Find longest pause between edits
        const pauses = [];
        for (let i = 1; i < changes.length; i++) {
            const pause = changes[i].timestamp - changes[i - 1].timestamp;
            pauses.push(pause);
        }
        const longestPauseBetweenEdits = pauses.length > 0 ? Math.max(...pauses) : 0;

        // Calculate editing velocity over time (changes per 5-minute window)
        const editingVelocityOverTime = this.calculateEditingVelocity(changes);

        return {
            totalDevelopmentTime,
            timeBeforeFirstCommit,
            numberOfEditSessions,
            averageSessionLength,
            longestPauseBetweenEdits,
            editingVelocityOverTime
        };
    }

    private identifyEditSessions(changes: EnhancedChangeEvent[], gapThreshold: number): Array<{
        start: number;
        end: number;
        duration: number;
        changeCount: number;
    }> {
        if (changes.length === 0) return [];

        const sessions = [];
        let sessionStart = changes[0].timestamp;
        let sessionEnd = changes[0].timestamp;
        let sessionChangeCount = 1;

        for (let i = 1; i < changes.length; i++) {
            const gap = changes[i].timestamp - changes[i - 1].timestamp;

            if (gap > gapThreshold) {
                // End current session
                sessions.push({
                    start: sessionStart,
                    end: sessionEnd,
                    duration: sessionEnd - sessionStart,
                    changeCount: sessionChangeCount
                });

                // Start new session
                sessionStart = changes[i].timestamp;
                sessionEnd = changes[i].timestamp;
                sessionChangeCount = 1;
            } else {
                sessionEnd = changes[i].timestamp;
                sessionChangeCount++;
            }
        }

        // Add final session
        sessions.push({
            start: sessionStart,
            end: sessionEnd,
            duration: sessionEnd - sessionStart,
            changeCount: sessionChangeCount
        });

        return sessions;
    }

    private calculateEditingVelocity(changes: EnhancedChangeEvent[]): number[] {
        if (changes.length === 0) return [];

        const windowSize = 5 * 60 * 1000; // 5 minutes
        const velocity = [];
        const startTime = changes[0].timestamp;
        const endTime = changes[changes.length - 1].timestamp;

        for (let windowStart = startTime; windowStart < endTime; windowStart += windowSize) {
            const windowEnd = windowStart + windowSize;
            const changesInWindow = changes.filter(change =>
                change.timestamp >= windowStart && change.timestamp < windowEnd
            );
            velocity.push(changesInWindow.length);
        }

        return velocity;
    }

    private analyzeEditPatterns(changes: EnhancedChangeEvent[]): EditPatterns {
        const incrementalEdits = changes.filter(change =>
            change.contentLength < 50 && change.changeType !== 'delete'
        ).length;

        const bulkReplacements = changes.filter(change =>
            change.changeType === 'replace' && change.contentLength > 100
        ).length;

        const refinementEdits = changes.filter(change =>
            change.timeSinceLastChange > 10000 && // After some thought
            change.contentLength < 100 // Small refinements
        ).length;

        const commentAdditions = changes.filter(change =>
            change.isComment
        ).length;

        const variableRenames = changes.filter(change =>
            change.changeType === 'replace' &&
            change.contentLength < 50 &&
            change.content && /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(change.content) // Looks like identifier
        ).length;

        const structuralChanges = changes.filter(change =>
            change.languageConstruct !== 'unknown' &&
            change.changeType === 'replace'
        ).length;

        return {
            incrementalEdits,
            bulkReplacements,
            refinementEdits,
            commentAdditions,
            variableRenames,
            structuralChanges
        };
    }

    private identifyReviewIndicators(
        changes: EnhancedChangeEvent[],
        timeMetrics: TimeMetrics
    ): ReviewIndicators {
        const multipleEditSessions = timeMetrics.numberOfEditSessions > 1;

        const pausesForReflection = changes.some(change =>
            change.timeSinceLastChange > 60000 // 1+ minute pauses
        );

        const incrementalRefinement = changes.filter((change, index) => {
            if (index === 0) return false;
            const prevChange = changes[index - 1];
            return change.timeSinceLastChange > 5000 && // 5+ second gap
                change.contentLength < prevChange.contentLength; // Smaller changes
        }).length > 2;

        const commentaryAdded = changes.some(change => change.isComment);

        const codeRestructuring = changes.some(change =>
            change.changeType === 'replace' &&
            change.contentLength > 50 &&
            change.languageConstruct !== 'unknown'
        );

        const testingEvidence = changes.some(change =>
            change.content?.toLowerCase().includes('test') ||
            change.content?.toLowerCase().includes('spec') ||
            change.content?.toLowerCase().includes('assert')
        );

        return {
            multipleEditSessions,
            pausesForReflection,
            incrementalRefinement,
            commentaryAdded,
            codeRestructuring,
            testingEvidence
        };
    }

    private calculateScoreBreakdown(
        timeMetrics: TimeMetrics,
        editPatterns: EditPatterns,
        reviewIndicators: ReviewIndicators
    ): ReviewScoreBreakdown {
        // Time investment score (0-3)
        let timeInvestmentScore = 0;
        if (timeMetrics.totalDevelopmentTime > 30 * 60 * 1000) timeInvestmentScore += 1; // 30+ minutes
        if (timeMetrics.totalDevelopmentTime > 2 * 60 * 60 * 1000) timeInvestmentScore += 1; // 2+ hours
        if (timeMetrics.timeBeforeFirstCommit > 10 * 60 * 1000) timeInvestmentScore += 1; // 10+ min before commit

        // Iteration score (0-3)
        let iterationScore = 0;
        if (reviewIndicators.multipleEditSessions) iterationScore += 1;
        if (editPatterns.refinementEdits > 2) iterationScore += 1;
        if (reviewIndicators.incrementalRefinement) iterationScore += 1;

        // Refinement score (0-2)
        let refinementScore = 0;
        if (editPatterns.commentAdditions > 0) refinementScore += 0.5;
        if (editPatterns.variableRenames > 0) refinementScore += 0.5;
        if (reviewIndicators.codeRestructuring) refinementScore += 0.5;
        if (reviewIndicators.testingEvidence) refinementScore += 0.5;

        // Thoughtfulness score (0-2)
        let thoughtfulnessScore = 0;
        if (reviewIndicators.pausesForReflection) thoughtfulnessScore += 1;
        if (timeMetrics.longestPauseBetweenEdits > 5 * 60 * 1000) thoughtfulnessScore += 1; // 5+ min pause

        const finalScore = timeInvestmentScore + iterationScore + refinementScore + thoughtfulnessScore;

        return {
            timeInvestment: timeMetrics.totalDevelopmentTime,
            iterationCount: timeMetrics.numberOfEditSessions,
            externalToolUsage: 0, // Could be enhanced with external tool detection
            humanRefinement: editPatterns.refinementEdits,
            timeInvestmentScore,
            iterationScore,
            refinementScore,
            thoughtfulnessScore,
            finalScore
        };
    }

    private determineQualityLevel(score: number): 'immediate-commit' | 'light-review' | 'thorough-review' | 'extensive-review' {
        if (score <= 2) return 'immediate-commit';
        if (score <= 5) return 'light-review';
        if (score <= 8) return 'thorough-review';
        return 'extensive-review';
    }

    private calculateConfidence(changes: EnhancedChangeEvent[], scoreBreakdown: ReviewScoreBreakdown): number {
        let confidence = 0.7; // Base confidence

        // Increase confidence with more data points
        if (changes.length > 10) confidence += 0.1;
        if (changes.length > 50) confidence += 0.1;

        // Increase confidence with clear patterns
        if (scoreBreakdown.finalScore <= 2 || scoreBreakdown.finalScore >= 8) {
            confidence += 0.1; // Clear extremes
        }

        return Math.min(confidence, 1.0);
    }

    private extractEvidence(changes: EnhancedChangeEvent[], _timeMetrics: TimeMetrics): ReviewEvidence {
        const editTimeline = changes.map(change => ({
            timestamp: change.timestamp,
            editType: `${change.changeType}-${change.languageConstruct}`,
            significance: change.contentLength > 100 ? 3 : change.contentLength > 20 ? 2 : 1
        }));

        const pauseAnalysis = [];
        for (let i = 1; i < changes.length; i++) {
            const pause = changes[i].timestamp - changes[i - 1].timestamp;
            if (pause > 30000) { // 30+ second pauses
                let likelyActivity = 'unknown';
                if (pause > 300000) likelyActivity = 'extended-break';
                else if (pause > 60000) likelyActivity = 'thinking-reviewing';
                else likelyActivity = 'brief-pause';

                pauseAnalysis.push({
                    duration: pause,
                    context: changes[i - 1].languageConstruct,
                    likelyActivity
                });
            }
        }

        const refinementExamples = changes
            .filter(change => change.timeSinceLastChange > 10000 && change.contentLength < 100 && change.content)
            .map(change => change.content!.substring(0, 50))
            .slice(0, 5); // Keep only first 5 examples

        return {
            editTimeline,
            pauseAnalysis,
            refinementExamples
        };
    }

    private createPatterns(
        reviewIndicators: ReviewIndicators,
        timeMetrics: TimeMetrics,
        _editPatterns: EditPatterns
    ): ReviewPatterns {
        return {
            immediateCommit: timeMetrics.timeBeforeFirstCommit < 5 * 60 * 1000, // < 5 minutes
            multiSessionReview: reviewIndicators.multipleEditSessions,
            crossToolCollaboration: false, // Could be enhanced with external tool detection
            incrementalRefinement: reviewIndicators.incrementalRefinement,
            multipleEditSessions: reviewIndicators.multipleEditSessions,
            pausesForReflection: reviewIndicators.pausesForReflection,
            commentaryAdded: reviewIndicators.commentaryAdded,
            codeRestructuring: reviewIndicators.codeRestructuring,
            testingEvidence: reviewIndicators.testingEvidence
        };
    }

    private createEmptyAssessment(): ReviewQualityAssessment {
        return {
            overallScore: 0,
            breakdown: {
                timeInvestment: 0,
                iterationCount: 0,
                externalToolUsage: 0,
                humanRefinement: 0,
                timeInvestmentScore: 0,
                iterationScore: 0,
                refinementScore: 0,
                thoughtfulnessScore: 0,
                finalScore: 0
            },
            patterns: {
                immediateCommit: true,
                multiSessionReview: false,
                crossToolCollaboration: false,
                incrementalRefinement: false,
                multipleEditSessions: false,
                pausesForReflection: false,
                commentaryAdded: false,
                codeRestructuring: false,
                testingEvidence: false
            },
            evidence: {
                editTimeline: [],
                pauseAnalysis: [],
                refinementExamples: []
            },
            qualityLevel: 'immediate-commit',
            confidence: 1.0
        };
    }

    private async logReviewMetrics(metrics: Omit<ReviewQualityMetricsLog, '_loggedAt' | '_version'>): Promise<void> {
        await this.logger.logReviewQualityMetrics({
            ...metrics,
            _loggedAt: Date.now(),
            _version: '1.0'
        });
    }

    // Public method to update session ID
    public updateSessionId(sessionId: string): void {
        this.currentSessionId = sessionId;
    }

    // Helper method for external analysis
    public async analyzeFileHistory(fileUri: string, fromTime?: number): Promise<ReviewQualityAssessment> {
        const changes = await this.logger.getChangeEventsForFile(fileUri, fromTime);
        return this.assessQuality(changes);
    }
}
