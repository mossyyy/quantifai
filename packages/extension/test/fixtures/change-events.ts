import { EnhancedChangeEvent } from '../../src/models/ChangeEvent';

export class ChangeEventGenerator {
    private static baseTimestamp = 1000000000000; // Fixed timestamp for deterministic tests

    static generateHumanTyping(content: string, sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const events: EnhancedChangeEvent[] = [];
        let currentTime = this.baseTimestamp;

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
                // content: excluded for privacy - not logged to disk
                contentLength: 1,
                timeSinceLastChange: timeBetweenKeys,
                timeSinceSessionStart: currentTime - this.baseTimestamp,
                timeSinceFileOpen: currentTime - this.baseTimestamp,
                source: 'live',
                vsCodeActive: true,
                cursorPosition: { line: 0, character: i + 1 },
                instantTypingSpeed: this.calculateTypingSpeed(1, timeBetweenKeys),
                rollingTypingSpeed: this.calculateTypingSpeed(Math.min(i + 1, 10), currentTime - this.baseTimestamp),
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
        const timestamp = this.baseTimestamp + 1000;

        return [{
            timestamp,
            sessionId,
            fileUri: 'file:///test/ai-pasted.ts',
            eventId: 'ai-paste-1',
            changeType: 'insert',
            position: { line: 0, character: 0 },
            // content: excluded for privacy - not logged to disk
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

    static generateClaudeCodeSession(changes: string[], sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const events: EnhancedChangeEvent[] = [];
        let currentTime = this.baseTimestamp;

        // First change after a 30-second gap (typical external tool pattern)
        currentTime += 30000;

        changes.forEach((change, index) => {
            if (index > 0) {
                currentTime += 1000; // 1 second between changes
            }

            events.push({
                timestamp: currentTime,
                sessionId,
                fileUri: 'file:///test/claude-session.ts',
                eventId: `claude-${index}`,
                changeType: index === 0 ? 'insert' : 'replace',
                position: { line: index, character: 0 },
                // content: excluded for privacy - not logged to disk
                contentLength: change.length,
                timeSinceLastChange: index === 0 ? 30000 : 1000,
                timeSinceSessionStart: currentTime - this.baseTimestamp,
                timeSinceFileOpen: currentTime - this.baseTimestamp,
                source: 'external',
                vsCodeActive: false, // External tool usage
                cursorPosition: { line: index, character: change.length },
                instantTypingSpeed: 0,
                rollingTypingSpeed: 0,
                burstDetected: true,
                pauseBeforeChange: index === 0 ? 30000 : 1000,
                isCodeBlock: change.length > 50,
                isComment: change.trim().startsWith('//'),
                isWhitespace: /^\s*$/.test(change),
                languageConstruct: this.detectLanguageConstruct(change),
                indentationLevel: this.calculateIndentation(change),
                externalToolSignature: {
                    detected: true,
                    toolType: 'claude-code',
                    confidence: 0.85,
                    indicators: ['claude-code-pattern', 'structured-code']
                }
            });
        });

        return events;
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

        // Add human refinement
        const humanRefinement = `
if (!numbers || numbers.length === 0) {
    return 0;
}`;
        events.push(...this.generateHumanTyping(humanRefinement, sessionId));

        return events;
    }

    static generateReviewSession(sessionId: string = 'test-session'): EnhancedChangeEvent[] {
        const events: EnhancedChangeEvent[] = [];
        let currentTime = this.baseTimestamp;

        // Initial code (AI-generated)
        const initialCode = `class DataProcessor {
    process(data: any[]): any[] {
        return data.map(item => item.value);
    }
}`;
        events.push(...this.generateAIPaste(initialCode, sessionId));

        // Long pause for review (5 minutes)
        currentTime = events[events.length - 1].timestamp + 300000;

        // Add type safety (human refinement)
        const typeRefinement = `interface DataItem {
    value: string;
    id: number;
}

class DataProcessor {
    process(data: DataItem[]): string[] {
        return data.map(item => item.value);
    }
}`;

        const refinementEvent: EnhancedChangeEvent = {
            timestamp: currentTime,
            sessionId,
            fileUri: 'file:///test/reviewed.ts',
            eventId: 'review-refinement',
            changeType: 'replace',
            position: { line: 0, character: 0 },
            // content: excluded for privacy - not logged to disk
            contentLength: typeRefinement.length,
            timeSinceLastChange: 300000,
            timeSinceSessionStart: currentTime - this.baseTimestamp,
            timeSinceFileOpen: currentTime - this.baseTimestamp,
            source: 'live',
            vsCodeActive: true,
            cursorPosition: { line: 8, character: 1 },
            instantTypingSpeed: 120, // Moderate typing speed
            rollingTypingSpeed: 100,
            burstDetected: false,
            pauseBeforeChange: 300000,
            isCodeBlock: true,
            isComment: false,
            isWhitespace: false,
            languageConstruct: 'interface',
            indentationLevel: 0
        };

        events.push(refinementEvent);

        return events;
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

// Pre-defined code samples for testing
export const CODE_SAMPLES = {
    SIMPLE_FUNCTION: `function add(a: number, b: number): number {
    return a + b;
}`,

    REACT_COMPONENT: `import React from 'react';

export const Button: React.FC<{onClick: () => void}> = ({ onClick }) => {
    return <button onClick={onClick}>Click me</button>;
};`,

    COMPLEX_CLASS: `class DataProcessor {
    private data: any[] = [];
    
    constructor(initialData: any[]) {
        this.data = initialData;
    }
    
    process(): ProcessedData {
        return this.data.map(item => this.transform(item));
    }
    
    private transform(item: any): any {
        // Complex transformation logic
        return { ...item, processed: true };
    }
}`,

    COMMENT_HEAVY: `/**
 * Calculates the factorial of a number
 * @param n - The number to calculate factorial for
 * @returns The factorial result
 */
function factorial(n: number): number {
    // Base case: factorial of 0 or 1 is 1
    if (n <= 1) {
        return 1;
    }
    
    // Recursive case: n * factorial(n-1)
    return n * factorial(n - 1);
}`
};
