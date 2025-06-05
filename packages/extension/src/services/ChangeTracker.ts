import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { type EnhancedChangeEvent, type Position, type SelectionRange } from '@ai-analyzer/core';
import { MetricsLogger } from './MetricsLogger';

export class ChangeTracker {
    private disposables: vscode.Disposable[] = [];
    private currentSessionId: string;
    private sessionStartTime: number;
    private fileOpenTimes: Map<string, number> = new Map();
    private lastChangeTime: Map<string, number> = new Map();
    private typingHistory: Map<string, Array<{ timestamp: number; length: number }>> = new Map();
    private logger: MetricsLogger;

    constructor(logger: MetricsLogger) {
        this.logger = logger;
        this.currentSessionId = uuidv4();
        this.sessionStartTime = Date.now();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Monitor document changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument(this.onDocumentChange.bind(this))
        );

        // Monitor document open/close
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument(this.onDocumentOpen.bind(this))
        );

        this.disposables.push(
            vscode.workspace.onDidCloseTextDocument(this.onDocumentClose.bind(this))
        );

        // Monitor file system changes (for external tool detection)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(this.onDocumentSave.bind(this))
        );

        // Monitor window focus (for external tool detection)
        this.disposables.push(
            vscode.window.onDidChangeWindowState(this.onWindowStateChange.bind(this))
        );
    }

    private async onDocumentChange(event: vscode.TextDocumentChangeEvent): Promise<void> {
        const document = event.document;
        const fileUri = document.uri.toString();
        const timestamp = Date.now();

        // Skip non-file schemes and certain file types
        if (document.uri.scheme !== 'file' || this.shouldIgnoreFile(document.fileName)) {
            return;
        }

        for (const change of event.contentChanges) {
            const enhancedEvent = await this.createEnhancedChangeEvent(
                document,
                change,
                timestamp,
                'live'
            );

            // Remove content field before logging for privacy
            const { content: _content, ...eventToLog } = enhancedEvent as any;

            await this.logger.logChangeEvent({
                ...eventToLog,
                _loggedAt: timestamp,
                _version: '1.0'
            });
        }

        this.lastChangeTime.set(fileUri, timestamp);
        this.updateTypingHistory(fileUri, timestamp, event.contentChanges);
    }

    private async onDocumentOpen(document: vscode.TextDocument): Promise<void> {
        if (document.uri.scheme !== 'file' || this.shouldIgnoreFile(document.fileName)) {
            return;
        }

        const fileUri = document.uri.toString();
        const timestamp = Date.now();
        this.fileOpenTimes.set(fileUri, timestamp);

        // Check for external changes since last VS Code session
        await this.detectExternalChanges(document);
    }

    private onDocumentClose(document: vscode.TextDocument): void {
        if (document.uri.scheme !== 'file') {
            return;
        }

        const fileUri = document.uri.toString();
        this.fileOpenTimes.delete(fileUri);
        this.lastChangeTime.delete(fileUri);
        this.typingHistory.delete(fileUri);
    }

    private async onDocumentSave(document: vscode.TextDocument): Promise<void> {
        // This could trigger commit analysis if integrated with git
        await this.logger.logDebugTrace({
            type: 'document-save',
            fileUri: document.uri.toString(),
            timestamp: Date.now(),
            sessionId: this.currentSessionId
        });
    }

    private onWindowStateChange(state: vscode.WindowState): void {
        // Track window focus changes for external tool detection
        this.logger.logDebugTrace({
            type: 'window-state-change',
            focused: state.focused,
            timestamp: Date.now(),
            sessionId: this.currentSessionId
        });
    }

    private async createEnhancedChangeEvent(
        document: vscode.TextDocument,
        change: vscode.TextDocumentContentChangeEvent,
        timestamp: number,
        source: 'live' | 'history' | 'external'
    ): Promise<EnhancedChangeEvent> {
        const fileUri = document.uri.toString();
        const lastChange = this.lastChangeTime.get(fileUri) || this.sessionStartTime;
        const fileOpenTime = this.fileOpenTimes.get(fileUri) || timestamp;

        // Determine change type
        let changeType: 'insert' | 'delete' | 'replace';
        if (change.rangeLength === 0) {
            changeType = 'insert';
        } else if (change.text.length === 0) {
            changeType = 'delete';
        } else {
            changeType = 'replace';
        }

        // Calculate typing metrics
        const timeSinceLastChange = timestamp - lastChange;
        const instantTypingSpeed = this.calculateInstantTypingSpeed(change.text, timeSinceLastChange);
        const rollingTypingSpeed = this.calculateRollingTypingSpeed(fileUri, timestamp);

        // Analyze content
        const contentAnalysis = this.analyzeContent(change.text, document, change.range.start);

        // Detect external tool signatures
        const externalToolSignature = await this.detectExternalToolSignature(
            change,
            timeSinceLastChange,
            document
        );

        const enhancedEvent: EnhancedChangeEvent = {
            timestamp,
            sessionId: this.currentSessionId,
            fileUri,
            eventId: uuidv4(),
            changeType,
            position: {
                line: change.range.start.line,
                character: change.range.start.character
            },
            // content: excluded for privacy - not logged to disk
            contentLength: change.text.length,
            timeSinceLastChange,
            timeSinceSessionStart: timestamp - this.sessionStartTime,
            timeSinceFileOpen: timestamp - fileOpenTime,
            source,
            vsCodeActive: vscode.window.state.focused,
            cursorPosition: this.getCurrentCursorPosition(),
            selectionRange: this.getCurrentSelection(),
            instantTypingSpeed,
            rollingTypingSpeed,
            burstDetected: this.detectTypingBurst(fileUri, timestamp),
            pauseBeforeChange: timeSinceLastChange,
            isCodeBlock: contentAnalysis.isCodeBlock,
            isComment: contentAnalysis.isComment,
            isWhitespace: contentAnalysis.isWhitespace,
            languageConstruct: contentAnalysis.languageConstruct,
            indentationLevel: contentAnalysis.indentationLevel,
            externalToolSignature
        };

        // For analysis purposes, temporarily add content (not logged)
        if (source === 'live') {
            (enhancedEvent as any).content = change.text;
        }

        return enhancedEvent;
    }

    private calculateInstantTypingSpeed(text: string, timeMs: number): number {
        if (timeMs === 0) return 0;
        const charactersPerMinute = (text.length / timeMs) * 60000;
        return Math.round(charactersPerMinute);
    }

    private calculateRollingTypingSpeed(fileUri: string, timestamp: number): number {
        const history = this.typingHistory.get(fileUri) || [];
        const thirtySecondsAgo = timestamp - 30000;

        const recentHistory = history.filter(entry => entry.timestamp >= thirtySecondsAgo);
        if (recentHistory.length === 0) return 0;

        const totalCharacters = recentHistory.reduce((sum, entry) => sum + entry.length, 0);
        const timeSpan = timestamp - recentHistory[0].timestamp;

        if (timeSpan === 0) return 0;
        return Math.round((totalCharacters / timeSpan) * 60000);
    }

    private updateTypingHistory(fileUri: string, timestamp: number, changes: readonly vscode.TextDocumentContentChangeEvent[]): void {
        const history = this.typingHistory.get(fileUri) || [];
        const totalLength = changes.reduce((sum, change) => sum + change.text.length, 0);

        history.push({ timestamp, length: totalLength });

        // Keep only last 60 seconds of history
        const sixtySecondsAgo = timestamp - 60000;
        const filteredHistory = history.filter(entry => entry.timestamp >= sixtySecondsAgo);

        this.typingHistory.set(fileUri, filteredHistory);
    }

    private detectTypingBurst(fileUri: string, timestamp: number): boolean {
        const history = this.typingHistory.get(fileUri) || [];
        const lastFiveSeconds = history.filter(entry => timestamp - entry.timestamp <= 5000);

        if (lastFiveSeconds.length < 3) return false;

        const totalCharacters = lastFiveSeconds.reduce((sum, entry) => sum + entry.length, 0);
        const speed = (totalCharacters / 5) * 60; // chars per minute

        return speed > 300; // Burst if typing faster than 300 CPM
    }

    private analyzeContent(text: string, document: vscode.TextDocument, position: vscode.Position): {
        isCodeBlock: boolean;
        isComment: boolean;
        isWhitespace: boolean;
        languageConstruct: string;
        indentationLevel: number;
    } {
        const isWhitespace = /^\s*$/.test(text);
        const isComment = this.detectComment(text, document.languageId);
        const isCodeBlock = text.length > 50 && text.includes('\n');
        const languageConstruct = this.detectLanguageConstruct(text, document.languageId);
        const indentationLevel = this.calculateIndentationLevel(document, position);

        return {
            isCodeBlock,
            isComment,
            isWhitespace,
            languageConstruct,
            indentationLevel
        };
    }

    private detectComment(text: string, languageId: string): boolean {
        const commentPatterns: { [key: string]: RegExp[] } = {
            typescript: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
            javascript: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
            python: [/^\s*#/],
            java: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
            csharp: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/]
        };

        const patterns = commentPatterns[languageId] || [];
        return patterns.some(pattern => pattern.test(text));
    }

    private detectLanguageConstruct(text: string, languageId: string): string {
        const constructPatterns: { [key: string]: { [pattern: string]: RegExp } } = {
            typescript: {
                'function': /^\s*(export\s+)?(async\s+)?function\s+/,
                'class': /^\s*(export\s+)?(abstract\s+)?class\s+/,
                'interface': /^\s*(export\s+)?interface\s+/,
                'variable': /^\s*(const|let|var)\s+/,
                'import': /^\s*import\s+/,
                'export': /^\s*export\s+/
            }
        };

        const patterns = constructPatterns[languageId] || {};
        for (const [construct, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return construct;
            }
        }

        return 'unknown';
    }

    private calculateIndentationLevel(document: vscode.TextDocument, position: vscode.Position): number {
        try {
            const line = document.lineAt(position.line);
            const match = line.text.match(/^(\s*)/);
            return match ? match[1].length : 0;
        } catch {
            return 0;
        }
    }

    private getCurrentCursorPosition(): Position {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return { line: 0, character: 0 };
        }

        const position = editor.selection.active;
        return {
            line: position.line,
            character: position.character
        };
    }

    private getCurrentSelection(): SelectionRange | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            return undefined;
        }

        return {
            start: {
                line: editor.selection.start.line,
                character: editor.selection.start.character
            },
            end: {
                line: editor.selection.end.line,
                character: editor.selection.end.character
            }
        };
    }

    private async detectExternalToolSignature(
        change: vscode.TextDocumentContentChangeEvent,
        timeSinceLastChange: number,
        _document: vscode.TextDocument
    ): Promise<any> {
        const indicators: string[] = [];
        let toolType: 'claude-code' | 'copilot' | 'cursor' | 'unknown' = 'unknown';
        let confidence = 0;

        // Large bulk insertion
        if (change.text.length > 100 && change.rangeLength === 0) {
            indicators.push('bulk-insertion');
            confidence += 0.3;
        }

        // Very fast change after long pause
        if (timeSinceLastChange > 10000 && change.text.length > 50) {
            indicators.push('external-paste');
            confidence += 0.4;
        }

        // Complete function/class replacement
        if (change.text.includes('function') || change.text.includes('class')) {
            indicators.push('structured-code');
            confidence += 0.2;
        }

        // Claude Code specific patterns
        if (change.text.includes('// ') && change.text.length > 200) {
            indicators.push('claude-code-pattern');
            toolType = 'claude-code';
            confidence += 0.3;
        }

        return indicators.length > 0 ? {
            detected: confidence > 0.5,
            toolType,
            confidence,
            indicators
        } : undefined;
    }

    private async detectExternalChanges(document: vscode.TextDocument): Promise<void> {
        // This would integrate with VS Code's local history to detect changes
        // made outside of the current session
        try {
            const stats = await vscode.workspace.fs.stat(document.uri);
            const lastKnownChange = this.lastChangeTime.get(document.uri.toString());

            if (lastKnownChange && stats.mtime > lastKnownChange) {
                await this.logger.logDebugTrace({
                    type: 'external-change-detected',
                    fileUri: document.uri.toString(),
                    lastKnownChange,
                    fileModTime: stats.mtime,
                    sessionId: this.currentSessionId
                });
            }
        } catch (error) {
            // File might not exist or be accessible
        }
    }

    private shouldIgnoreFile(fileName: string): boolean {
        const ignoredExtensions = ['.log', '.tmp', '.cache'];
        const ignoredPaths = ['node_modules', '.git', '.vscode'];

        return ignoredExtensions.some(ext => fileName.endsWith(ext)) ||
            ignoredPaths.some(pathPart => fileName.includes(pathPart));
    }

    // Public methods
    public getCurrentSessionId(): string {
        return this.currentSessionId;
    }

    public startNewSession(): void {
        this.currentSessionId = uuidv4();
        this.sessionStartTime = Date.now();
        this.fileOpenTimes.clear();
        this.lastChangeTime.clear();
        this.typingHistory.clear();
    }

    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
