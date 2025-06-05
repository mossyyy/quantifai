export interface Position {
    line: number;
    character: number;
}

export interface SelectionRange {
    start: Position;
    end: Position;
}

export interface ExternalToolSignature {
    detected: boolean;
    toolType: 'claude-code' | 'copilot' | 'cursor' | 'unknown';
    confidence: number;
    indicators: string[];
}

export interface EnhancedChangeEvent {
    timestamp: number;
    sessionId: string;
    fileUri: string;
    eventId: string;

    // Raw change data
    changeType: 'insert' | 'delete' | 'replace';
    position: Position;
    content?: string; // Made optional for privacy - not logged to disk
    contentLength: number;

    // Timing metrics
    timeSinceLastChange: number;
    timeSinceSessionStart: number;
    timeSinceFileOpen: number;

    // Context metrics
    source: 'live' | 'history' | 'external';
    vsCodeActive: boolean;
    cursorPosition: Position;
    selectionRange?: SelectionRange;

    // Velocity metrics
    instantTypingSpeed: number; // chars/minute at this moment
    rollingTypingSpeed: number; // chars/minute over last 30 seconds
    burstDetected: boolean;
    pauseBeforeChange: number;

    // Content analysis
    isCodeBlock: boolean;
    isComment: boolean;
    isWhitespace: boolean;
    languageConstruct: string; // 'function', 'class', 'variable', etc.
    indentationLevel: number;

    // External tool detection
    externalToolSignature?: ExternalToolSignature;
}

export interface ChangeEventLog extends EnhancedChangeEvent {
    _loggedAt: number;
    _version: string;
}
