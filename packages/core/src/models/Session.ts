export interface DevelopmentSession {
    sessionId: string;
    startTime: number;
    endTime: number;
    duration: number;
    filesModified: FileActivity[];
    sessionMetrics: SessionMetrics;
    developmentPatterns: DevelopmentPatterns;
    crossFilePatterns: CrossFilePatterns;
}

export interface FileActivity {
    uri: string;
    totalChanges: number;
    linesAdded: number;
    linesDeleted: number;
    aiContribution: number;
    humanContribution: number;
    reviewQuality: number;
}

export interface SessionMetrics {
    totalKeystrokes: number;
    averageTypingSpeed: number;
    totalPauses: number;
    averagePauseLength: number;
    externalToolUsage: Array<{
        tool: string;
        usageCount: number;
        totalTime: number;
    }>;
}

export interface DevelopmentPatterns {
    workflowType: 'ai-first' | 'human-first' | 'collaborative' | 'mixed';
    aiToolIntegration: 'heavy' | 'moderate' | 'light' | 'none';
    reviewThoroughness: 'minimal' | 'standard' | 'thorough' | 'extensive';
}

export interface CrossFilePatterns {
    consistentStyle: boolean;
    relatedChanges: boolean;
    refactoringEvidence: boolean;
}

export interface SessionSummaryLog {
    sessionId: string;
    startTime: number;
    endTime: number;
    duration: number;
    filesModified: FileActivity[];
    sessionMetrics: SessionMetrics;
    developmentPatterns: DevelopmentPatterns;
    crossFilePatterns: CrossFilePatterns;
    _loggedAt: number;
    _version: string;
}

export interface TimelineEntry {
    timestamp: number;
    activity: string;
    tool: string;
    significance: number;
}

export interface CommitAnalysis {
    commitId: string;
    timestamp: number;
    message: string;
    fileAnalysis: CommitFileAnalysis[];
    commitMetrics: CommitMetrics;
    commitQuality: CommitQuality;
    developmentTimeline: TimelineEntry[];
}

export interface CommitFileAnalysis {
    uri: string;
    linesChanged: number;
    aiGeneratedLines: number;
    humanWrittenLines: number;
    reviewedLines: number;
    aiConfidence: number;
    reviewQuality: number;
}

export interface CommitMetrics {
    totalLinesChanged: number;
    aiContributionPercentage: number;
    humanContributionPercentage: number;
    averageReviewQuality: number;
    developmentTimespan: number;
    numberOfSessions: number;
}

export interface CommitQuality {
    overallScore: number;
    aiIntegrationQuality: number;
    reviewThoroughness: number;
    codeQualityIndicators: string[];
    potentialIssues: string[];
}

export interface CommitAnalysisLog {
    commitId: string;
    timestamp: number;
    message: string;
    fileAnalysis: CommitFileAnalysis[];
    commitMetrics: CommitMetrics;
    commitQuality: CommitQuality;
    developmentTimeline: TimelineEntry[];
    _loggedAt: number;
    _version: string;
}
