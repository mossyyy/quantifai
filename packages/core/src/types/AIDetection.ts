export interface AIAttribution {
    source: 'human' | 'ai-assisted' | 'ai-generated' | 'mixed';
    confidence: number;
    aiProbability: number;
    evidence: AIEvidence;
    timeline: AITimeline;
}

export interface AIEvidence {
    externalToolSignature: boolean;
    bulkChangePattern: boolean;
    timingAnomalies: boolean;
    contentCharacteristics: string[];
    bulkChanges: Array<{
        size: number;
        timespan: number;
        content: string;
    }>;
    typingBursts: Array<{
        speed: number;
        duration: number;
        content: string;
    }>;
    externalIndicators: string[];
    suspiciousPatterns: string[];
}

export interface AITimeline {
    vsCodeEvents: any[];
    externalEvents: ExternalChangeEvent[];
    gaps: TimeGap[];
}

export interface ExternalChangeEvent {
    timestamp: number;
    fileUri: string;
    changeType: 'bulk-insert' | 'bulk-replace' | 'structured-edit';
    contentLength: number;
    detectedTool: string;
    confidence: number;
}

export interface TimeGap {
    startTime: number;
    endTime: number;
    duration: number;
    likelyActivity: string;
}

export interface HeuristicScores {
    bulkInsertionScore: number;
    typingSpeedScore: number;
    pastePatternScore: number;
    externalToolScore: number;
    contentPatternScore: number;
    timingAnomalyScore: number;
}

export interface WeightedScore {
    rawScore: number;
    weight: number;
    weightedScore: number;
}

export interface DecisionTraceStep {
    step: string;
    input: any;
    output: any;
    reasoning: string;
}

export interface AIDetectionMetricsLog {
    timestamp: number;
    sessionId: string;
    fileUri: string;
    analysisId: string;

    // Input data summary
    totalChanges: number;
    timeSpanMs: number;
    contentLengthTotal: number;

    // Individual heuristic scores (0-1)
    heuristicScores: HeuristicScores;

    // Weighted combination
    weightedScores: { [heuristic: string]: WeightedScore };

    // Final determination
    finalConfidence: number;
    aiProbability: number;
    classification: 'human' | 'ai-assisted' | 'ai-generated' | 'mixed';

    // Evidence details
    evidence: AIEvidence;

    // Algorithm trace
    decisionTrace: DecisionTraceStep[];

    // Logging metadata
    _loggedAt: number;
    _version: string;
}

export interface AIDetectionConfig {
    // Heuristic weights (should sum to 1.0)
    weights: {
        bulkInsertionScore: number;
        typingSpeedScore: number;
        pastePatternScore: number;
        externalToolScore: number;
        contentPatternScore: number;
        timingAnomalyScore: number;
    };

    // Thresholds for detection
    thresholds: {
        bulkInsertionSize: number;        // Characters for bulk insertion
        fastTypingSpeed: number;          // CPM for fast typing
        pasteTimeThreshold: number;       // ms for paste detection
        longPauseThreshold: number;       // ms for long pauses
        rapidSequenceThreshold: number;   // ms for rapid sequences
    };

    // Classification thresholds
    classification: {
        humanThreshold: number;           // Below this = human
        aiAssistedThreshold: number;      // Above this = ai-assisted
        aiGeneratedThreshold: number;     // Above this = ai-generated
    };

    // Bucket configuration for timeline analysis
    bucketConfig: {
        intervalMinutes: number;          // Time bucket size in minutes
        aggregationMethod: 'average' | 'max' | 'weighted'; // How to combine scores
        minEventsPerBucket: number;       // Minimum events to consider bucket active
    };
}
