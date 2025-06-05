import type { EnhancedChangeEvent, AIDetectionMetricsLog } from '@ai-analyzer/core';

export interface ReviewQualityMetric {
    timestamp: number;
    sessionId: string;
    fileUri: string;
    analysisId: string;
    timeMetrics: {
        totalDevelopmentTime: number;
        timeBeforeFirstCommit: number;
        numberOfEditSessions: number;
        averageSessionLength: number;
        longestPauseBetweenEdits: number;
        editingVelocityOverTime: number[];
    };
    editPatterns: {
        incrementalEdits: number;
        bulkReplacements: number;
        refinementEdits: number;
        commentAdditions: number;
        variableRenames: number;
        structuralChanges: number;
    };
    reviewIndicators: {
        multipleEditSessions: boolean;
        pausesForReflection: boolean;
        incrementalRefinement: boolean;
        commentaryAdded: boolean;
        codeRestructuring: boolean;
        testingEvidence: boolean;
    };
    scoreBreakdown: {
        timeInvestment: number;
        iterationCount: number;
        externalToolUsage: number;
        humanRefinement: number;
        timeInvestmentScore: number;
        iterationScore: number;
        refinementScore: number;
        thoughtfulnessScore: number;
        finalScore: number;
    };
    qualityLevel: string;
    confidence: number;
    evidence: {
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
    };
    _loggedAt: number;
    _version: string;
}

export class DataService {
    // Sample data generators based on the test fixtures
    static generateHumanTyping(content: string, sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const events: EnhancedChangeEvent[] = [];
        let currentTime = 1000000000000; // Fixed timestamp for deterministic tests

        // Simulate realistic human typing patterns
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const timeBetweenKeys = this.randomBetween(50, 200); // 50-200ms between keystrokes
            currentTime += timeBetweenKeys;

            events.push({
                timestamp: currentTime,
                sessionId,
                fileUri: 'file:///test/human-typed.ts',
                eventId: `human-${i}`,
                changeType: 'insert',
                position: { line: 0, character: i },
                contentLength: 1,
                timeSinceLastChange: timeBetweenKeys,
                timeSinceSessionStart: currentTime - 1000000000000,
                timeSinceFileOpen: currentTime - 1000000000000,
                source: 'live',
                vsCodeActive: true,
                cursorPosition: { line: 0, character: i + 1 },
                instantTypingSpeed: this.calculateTypingSpeed(1, timeBetweenKeys),
                rollingTypingSpeed: this.calculateTypingSpeed(Math.min(i + 1, 10), currentTime - 1000000000000),
                burstDetected: false,
                pauseBeforeChange: timeBetweenKeys,
                isCodeBlock: false,
                isComment: char === '/' && i > 0 && content[i - 1] === '/',
                isWhitespace: /\s/.test(char),
                languageConstruct: 'unknown',
                indentationLevel: 0
            });
        }

        return events;
    }

    static generateAIPaste(content: string, sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const timestamp = 1000000000000 + 1000;

        return [{
            timestamp,
            sessionId,
            fileUri: 'file:///test/ai-pasted.ts',
            eventId: 'ai-paste-1',
            changeType: 'insert',
            position: { line: 0, character: 0 },
            contentLength: content.length,
            timeSinceLastChange: 0,
            timeSinceSessionStart: 1000,
            timeSinceFileOpen: 1000,
            source: 'external',
            vsCodeActive: true,
            cursorPosition: { line: 0, character: content.length },
            instantTypingSpeed: 0, // Instantaneous
            rollingTypingSpeed: 0,
            burstDetected: true,
            pauseBeforeChange: 0,
            isCodeBlock: content.length > 50 && content.includes('\n'),
            isComment: content.trim().startsWith('//') || content.trim().startsWith('/*'),
            isWhitespace: /^\s*$/.test(content),
            languageConstruct: this.detectLanguageConstruct(content),
            indentationLevel: this.calculateIndentation(content),
            externalToolSignature: {
                detected: true,
                toolType: 'claude-code',
                confidence: 0.9,
                indicators: ['bulk-insertion', 'external-paste', 'structured-code']
            }
        }];
    }

    static generateMixedSession(sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const events: EnhancedChangeEvent[] = [];

        // Start with AI-generated code
        const aiCode = `function calculateSum(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
}`;
        events.push(...this.generateAIPaste(aiCode, sessionId));

        // Add human review comments
        const humanComment = '// Added error handling';
        events.push(...this.generateHumanTyping(humanComment, sessionId));

        return events;
    }

    static generateBurstSession(sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const events: EnhancedChangeEvent[] = [];
        let currentTime = 1000000000000;

        // Generate a burst of very fast typing (suspicious)
        const burstContent = 'const result = data.map(item => item.value).filter(Boolean);';

        for (let i = 0; i < burstContent.length; i++) {
            currentTime += this.randomBetween(10, 30); // Very fast typing

            events.push({
                timestamp: currentTime,
                sessionId,
                fileUri: 'file:///test/burst-session.ts',
                eventId: `burst-${i}`,
                changeType: 'insert',
                position: { line: 0, character: i },
                contentLength: 1,
                timeSinceLastChange: i === 0 ? 0 : this.randomBetween(10, 30),
                timeSinceSessionStart: currentTime - 1000000000000,
                timeSinceFileOpen: currentTime - 1000000000000,
                source: 'live',
                vsCodeActive: true,
                cursorPosition: { line: 0, character: i + 1 },
                instantTypingSpeed: 600, // Very high speed
                rollingTypingSpeed: 500,
                burstDetected: true,
                pauseBeforeChange: i === 0 ? 0 : this.randomBetween(10, 30),
                isCodeBlock: false,
                isComment: false,
                isWhitespace: /\s/.test(burstContent[i]),
                languageConstruct: 'variable',
                indentationLevel: 0
            });
        }

        return events;
    }

    static async parseJSONLFile(content: string): Promise<EnhancedChangeEvent[]> {
        const lines = content.trim().split('\n');
        const events: EnhancedChangeEvent[] = [];

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);

                // Check if this looks like a change event
                if (parsed.timestamp && parsed.changeType && parsed.contentLength !== undefined) {
                    events.push(parsed as EnhancedChangeEvent);
                } else if (parsed.evidence && parsed.evidence.editTimeline) {
                    // If it's a review quality metric, extract the timeline events
                    console.log('Converting review quality metric to change events...');
                    const timelineEvents = this.convertReviewMetricToChangeEvents(parsed);
                    events.push(...timelineEvents);
                } else {
                    console.warn('Skipping line - not a change event or review metric:', line.substring(0, 100) + '...');
                }
            } catch (error) {
                console.warn('Failed to parse line:', line.substring(0, 100) + '...', error);
            }
        }

        return events;
    }

    static async parseJSONLFileStreaming(file: File, onProgress?: (progress: number) => void): Promise<EnhancedChangeEvent[]> {
        const events: EnhancedChangeEvent[] = [];
        const reader = file.stream().getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let bytesRead = 0;
        const totalBytes = file.size;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                bytesRead += value.length;
                buffer += decoder.decode(value, { stream: true });

                // Report progress
                if (onProgress) {
                    onProgress((bytesRead / totalBytes) * 100);
                }

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsed = JSON.parse(line);

                            // Check if this looks like a change event
                            if (parsed.timestamp && parsed.changeType && parsed.contentLength !== undefined) {
                                events.push(parsed as EnhancedChangeEvent);
                            } else if (parsed.evidence && parsed.evidence.editTimeline) {
                                // If it's a review quality metric, extract the timeline events
                                const timelineEvents = this.convertReviewMetricToChangeEvents(parsed);
                                events.push(...timelineEvents);
                            }
                        } catch (error) {
                            console.warn('Failed to parse line:', line.substring(0, 100) + '...', error);
                        }
                    }
                }

                // Yield control to prevent UI blocking
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // Process any remaining content in buffer
            if (buffer.trim()) {
                try {
                    const parsed = JSON.parse(buffer);
                    if (parsed.timestamp && parsed.changeType && parsed.contentLength !== undefined) {
                        events.push(parsed as EnhancedChangeEvent);
                    } else if (parsed.evidence && parsed.evidence.editTimeline) {
                        const timelineEvents = this.convertReviewMetricToChangeEvents(parsed);
                        events.push(...timelineEvents);
                    }
                } catch (error) {
                    console.warn('Failed to parse final line:', buffer.substring(0, 100) + '...', error);
                }
            }

        } finally {
            reader.releaseLock();
        }

        return events;
    }

    static convertReviewMetricToChangeEvents(metric: ReviewQualityMetric): EnhancedChangeEvent[] {
        return metric.evidence.editTimeline.map((edit, index) => ({
            timestamp: edit.timestamp,
            sessionId: metric.sessionId,
            fileUri: metric.fileUri,
            eventId: `${metric.analysisId}-${index}`,
            changeType: edit.editType.includes('insert') ? 'insert' as const :
                edit.editType.includes('delete') ? 'delete' as const : 'replace' as const,
            position: { line: 0, character: 0 },
            contentLength: edit.significance * 10, // Rough approximation
            timeSinceLastChange: index > 0 ? edit.timestamp - metric.evidence.editTimeline[index - 1].timestamp : 0,
            timeSinceSessionStart: edit.timestamp - metric.timestamp,
            timeSinceFileOpen: edit.timestamp - metric.timestamp,
            source: 'live' as const,
            vsCodeActive: true,
            cursorPosition: { line: 0, character: 0 },
            instantTypingSpeed: Math.random() * 200 + 50, // Simulated
            rollingTypingSpeed: Math.random() * 200 + 50, // Simulated
            burstDetected: edit.significance > 2,
            pauseBeforeChange: index > 0 ? edit.timestamp - metric.evidence.editTimeline[index - 1].timestamp : 0,
            isCodeBlock: edit.editType.includes('unknown'),
            isComment: false,
            isWhitespace: false,
            languageConstruct: 'unknown',
            indentationLevel: 0
        }));
    }

    static getSampleDatasets(): { [key: string]: EnhancedChangeEvent[] } {
        return {
            'Human Typing': this.generateHumanTyping('function add(a, b) { return a + b; }'),
            'AI Paste': this.generateAIPaste(`function calculateSum(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
}`),
            'Mixed Session': this.generateMixedSession(),
            'Burst Typing': this.generateBurstSession(),
        };
    }

    private static randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private static calculateTypingSpeed(characters: number, timeMs: number): number {
        if (timeMs === 0) return 0;
        return Math.round((characters / timeMs) * 60000); // Characters per minute
    }

    private static detectLanguageConstruct(content: string): string {
        if (/^\s*(export\s+)?(async\s+)?function\s+/.test(content)) return 'function';
        if (/^\s*(export\s+)?(abstract\s+)?class\s+/.test(content)) return 'class';
        if (/^\s*(export\s+)?interface\s+/.test(content)) return 'interface';
        if (/^\s*(const|let|var)\s+/.test(content)) return 'variable';
        if (/^\s*import\s+/.test(content)) return 'import';
        if (/^\s*export\s+/.test(content)) return 'export';
        return 'unknown';
    }

    private static calculateIndentation(content: string): number {
        const match = content.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
}
