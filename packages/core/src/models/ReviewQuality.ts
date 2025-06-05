export interface ReviewQualityAssessment {
    overallScore: number; // 0-10
    breakdown: ReviewScoreBreakdown;
    patterns: ReviewPatterns;
    evidence: ReviewEvidence;
    qualityLevel: 'immediate-commit' | 'light-review' | 'thorough-review' | 'extensive-review';
    confidence: number;
}

export interface ReviewScoreBreakdown {
    timeInvestment: number; // Time spent reviewing
    iterationCount: number; // Number of edit cycles
    externalToolUsage: number; // How external tools were integrated
    humanRefinement: number; // Post-AI human improvements
    timeInvestmentScore: number;
    iterationScore: number;
    refinementScore: number;
    thoughtfulnessScore: number;
    finalScore: number;
}

export interface ReviewPatterns {
    immediateCommit: boolean;
    multiSessionReview: boolean;
    crossToolCollaboration: boolean;
    incrementalRefinement: boolean;
    multipleEditSessions: boolean;
    pausesForReflection: boolean;
    commentaryAdded: boolean;
    codeRestructuring: boolean;
    testingEvidence: boolean;
}

export interface ReviewEvidence {
    editTimeline: Array<{
        timestamp: number;
        editType: string;
        significance: number;
    }>;
    pauseAnalysis: Array<{
        duration: number;
        context: string;
        likelyActivity: string;
    }>;
    refinementExamples: string[];
}

export interface TimeMetrics {
    totalDevelopmentTime: number;
    timeBeforeFirstCommit: number;
    numberOfEditSessions: number;
    averageSessionLength: number;
    longestPauseBetweenEdits: number;
    editingVelocityOverTime: number[];
}

export interface EditPatterns {
    incrementalEdits: number;
    bulkReplacements: number;
    refinementEdits: number;
    commentAdditions: number;
    variableRenames: number;
    structuralChanges: number;
}

export interface ReviewIndicators {
    multipleEditSessions: boolean;
    pausesForReflection: boolean;
    incrementalRefinement: boolean;
    commentaryAdded: boolean;
    codeRestructuring: boolean;
    testingEvidence: boolean;
}

export interface ReviewQualityMetricsLog {
    timestamp: number;
    sessionId: string;
    fileUri: string;
    analysisId: string;

    // Time-based metrics
    timeMetrics: TimeMetrics;

    // Edit pattern analysis
    editPatterns: EditPatterns;

    // Review indicators
    reviewIndicators: ReviewIndicators;

    // Scoring breakdown
    scoreBreakdown: ReviewScoreBreakdown;

    // Quality classification
    qualityLevel: 'immediate-commit' | 'light-review' | 'thorough-review' | 'extensive-review';
    confidence: number;

    // Supporting evidence
    evidence: ReviewEvidence;

    // Logging metadata
    _loggedAt: number;
    _version: string;
}
