import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
    type EnhancedChangeEvent,
    type SessionSummaryLog,
    type CommitAnalysisLog,
    type ReviewQualityMetricsLog
} from '@ai-analyzer/core';

// Extension-specific logging interfaces
interface ChangeEventLog extends EnhancedChangeEvent {
    _loggedAt: number;
    _version: string;
}

interface AIDetectionMetricsLog {
    timestamp: number;
    sessionId: string;
    fileUri: string;
    analysisId: string;
    totalChanges: number;
    timeSpanMs: number;
    contentLengthTotal: number;
    heuristicScores: any;
    weightedScores: any;
    finalConfidence: number;
    aiProbability: number;
    classification: 'human' | 'ai-assisted' | 'ai-generated' | 'mixed';
    evidence: any;
    decisionTrace: any[];
    _loggedAt: number;
    _version: string;
}

export class MetricsLogger {
    private workspaceRoot: string;
    private logDirectory: string;
    private isEnabled: boolean;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.logDirectory = path.join(workspaceRoot, '.vscode', 'ai-code-analyzer');
        this.isEnabled = vscode.workspace.getConfiguration('aiCodeAnalyzer').get('enableLogging', true);
        this.ensureLogDirectory();
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.logDirectory, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    async logChangeEvent(event: ChangeEventLog): Promise<void> {
        if (!this.isEnabled) return;
        await this.appendToLog('change-events.jsonl', event);
    }

    async logAIDetectionMetrics(metrics: AIDetectionMetricsLog): Promise<void> {
        if (!this.isEnabled) return;
        await this.appendToLog('ai-detection-metrics.jsonl', metrics);
    }

    async logReviewQualityMetrics(metrics: ReviewQualityMetricsLog): Promise<void> {
        if (!this.isEnabled) return;
        await this.appendToLog('review-quality-metrics.jsonl', metrics);
    }

    async logSessionSummary(summary: SessionSummaryLog): Promise<void> {
        if (!this.isEnabled) return;
        await this.appendToLog('session-summaries.jsonl', summary);
    }

    async logCommitAnalysis(analysis: CommitAnalysisLog): Promise<void> {
        if (!this.isEnabled) return;
        await this.appendToLog('commit-analysis.jsonl', analysis);
    }

    async logDebugTrace(trace: any): Promise<void> {
        if (!this.isEnabled) return;
        await this.appendToLog('debug-traces.jsonl', {
            ...trace,
            timestamp: Date.now(),
            _loggedAt: Date.now(),
            _version: '1.0'
        });
    }

    private async appendToLog(filename: string, data: any): Promise<void> {
        try {
            const logPath = path.join(this.logDirectory, filename);
            const logLine = JSON.stringify({
                ...data,
                _loggedAt: data._loggedAt || Date.now(),
                _version: data._version || '1.0'
            }) + '\n';

            await fs.appendFile(logPath, logLine, 'utf8');
        } catch (error) {
            console.error(`Failed to write to log file ${filename}:`, error);
        }
    }

    // Analysis helper methods
    async getChangeEventsForFile(fileUri: string, fromTime?: number): Promise<ChangeEventLog[]> {
        try {
            const events = await this.readLogFile<ChangeEventLog>('change-events.jsonl');
            return events
                .filter(event => event.fileUri === fileUri)
                .filter(event => !fromTime || event.timestamp >= fromTime)
                .sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Failed to read change events:', error);
            return [];
        }
    }

    async getSessionSummary(sessionId: string): Promise<SessionSummaryLog | null> {
        try {
            const summaries = await this.readLogFile<SessionSummaryLog>('session-summaries.jsonl');
            return summaries.find(s => s.sessionId === sessionId) || null;
        } catch (error) {
            console.error('Failed to read session summary:', error);
            return null;
        }
    }

    async getAIDetectionMetrics(fileUri: string, fromTime?: number): Promise<AIDetectionMetricsLog[]> {
        try {
            const metrics = await this.readLogFile<AIDetectionMetricsLog>('ai-detection-metrics.jsonl');
            return metrics
                .filter(metric => metric.fileUri === fileUri)
                .filter(metric => !fromTime || metric.timestamp >= fromTime)
                .sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Failed to read AI detection metrics:', error);
            return [];
        }
    }

    async getReviewQualityMetrics(fileUri: string, fromTime?: number): Promise<ReviewQualityMetricsLog[]> {
        try {
            const metrics = await this.readLogFile<ReviewQualityMetricsLog>('review-quality-metrics.jsonl');
            return metrics
                .filter(metric => metric.fileUri === fileUri)
                .filter(metric => !fromTime || metric.timestamp >= fromTime)
                .sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Failed to read review quality metrics:', error);
            return [];
        }
    }

    async getAllCommitAnalyses(): Promise<CommitAnalysisLog[]> {
        try {
            const analyses = await this.readLogFile<CommitAnalysisLog>('commit-analysis.jsonl');
            return analyses.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Failed to read commit analyses:', error);
            return [];
        }
    }

    private async readLogFile<T>(filename: string): Promise<T[]> {
        try {
            const logPath = path.join(this.logDirectory, filename);
            const content = await fs.readFile(logPath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            return lines.map(line => JSON.parse(line) as T);
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                // File doesn't exist yet, return empty array
                return [];
            }
            throw error;
        }
    }

    // Export functionality for external analysis
    async exportMetricsAsCSV(): Promise<string> {
        try {
            const changeEvents = await this.readLogFile<ChangeEventLog>('change-events.jsonl');
            const aiMetrics = await this.readLogFile<AIDetectionMetricsLog>('ai-detection-metrics.jsonl');
            const reviewMetrics = await this.readLogFile<ReviewQualityMetricsLog>('review-quality-metrics.jsonl');

            // Create CSV content
            let csv = 'Type,Timestamp,FileUri,SessionId,Data\n';

            changeEvents.forEach(event => {
                csv += `ChangeEvent,${event.timestamp},${event.fileUri},${event.sessionId},"${JSON.stringify(event).replace(/"/g, '""')}"\n`;
            });

            aiMetrics.forEach(metric => {
                csv += `AIDetection,${metric.timestamp},${metric.fileUri},${metric.sessionId},"${JSON.stringify(metric).replace(/"/g, '""')}"\n`;
            });

            reviewMetrics.forEach(metric => {
                csv += `ReviewQuality,${metric.timestamp},${metric.fileUri},${metric.sessionId},"${JSON.stringify(metric).replace(/"/g, '""')}"\n`;
            });

            return csv;
        } catch (error) {
            console.error('Failed to export metrics as CSV:', error);
            return '';
        }
    }

    // Log rotation and cleanup
    async rotateLogsIfNeeded(): Promise<void> {
        const maxLogSize = 10 * 1024 * 1024; // 10MB
        const maxLogAge = 30 * 24 * 60 * 60 * 1000; // 30 days

        const logFiles = [
            'change-events.jsonl',
            'ai-detection-metrics.jsonl',
            'review-quality-metrics.jsonl',
            'session-summaries.jsonl',
            'commit-analysis.jsonl',
            'debug-traces.jsonl'
        ];

        for (const filename of logFiles) {
            try {
                const logPath = path.join(this.logDirectory, filename);
                const stats = await fs.stat(logPath);

                // Check if file is too large or too old
                if (stats.size > maxLogSize || (Date.now() - stats.mtime.getTime()) > maxLogAge) {
                    // Archive the file
                    const archivePath = path.join(this.logDirectory, `${filename}.${Date.now()}.archive`);
                    await fs.rename(logPath, archivePath);

                    // Clean up old archives (keep only last 5)
                    await this.cleanupOldArchives(filename);
                }
            } catch (error) {
                // File might not exist, which is fine
                if ((error as any).code !== 'ENOENT') {
                    console.error(`Failed to rotate log ${filename}:`, error);
                }
            }
        }
    }

    private async cleanupOldArchives(baseFilename: string): Promise<void> {
        try {
            const files = await fs.readdir(this.logDirectory);
            const archives = files
                .filter(file => file.startsWith(`${baseFilename}.`) && file.endsWith('.archive'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDirectory, file),
                    timestamp: parseInt(file.split('.')[1])
                }))
                .sort((a, b) => b.timestamp - a.timestamp);

            // Keep only the 5 most recent archives
            const toDelete = archives.slice(5);
            for (const archive of toDelete) {
                await fs.unlink(archive.path);
            }
        } catch (error) {
            console.error('Failed to cleanup old archives:', error);
        }
    }

    // Get log directory path for external access
    getLogDirectory(): string {
        return this.logDirectory;
    }

    // Check if logging is enabled
    isLoggingEnabled(): boolean {
        return this.isEnabled;
    }

    // Update logging configuration
    updateConfiguration(): void {
        this.isEnabled = vscode.workspace.getConfiguration('aiCodeAnalyzer').get('enableLogging', true);
    }
}
