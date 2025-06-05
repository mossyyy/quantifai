import * as vscode from 'vscode';
import { MetricsLogger } from './services/MetricsLogger';
import { ChangeTracker } from './services/ChangeTracker';
import { AIDetectionService } from './services/AIDetectionService';
import { ReviewAnalyzer } from './services/ReviewAnalyzer';

let logger: MetricsLogger;
let changeTracker: ChangeTracker;
let aiDetectionService: AIDetectionService;
let reviewAnalyzer: ReviewAnalyzer;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Code Analyzer extension is now active!');

    // Initialize services
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showWarningMessage('AI Code Analyzer requires an open workspace to function.');
        return;
    }

    logger = new MetricsLogger(workspaceRoot);
    changeTracker = new ChangeTracker(logger);
    aiDetectionService = new AIDetectionService(logger, changeTracker.getCurrentSessionId());
    reviewAnalyzer = new ReviewAnalyzer(logger, changeTracker.getCurrentSessionId());

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(robot) AI Analyzer';
    statusBarItem.tooltip = 'AI Code Analyzer - Click for current file analysis';
    statusBarItem.command = 'ai-analyzer.analyzeCurrentFile';
    statusBarItem.show();

    // Register commands
    registerCommands(context);

    // Set up periodic log rotation
    const rotationInterval = setInterval(() => {
        logger.rotateLogsIfNeeded().catch(error => {
            console.error('Failed to rotate logs:', error);
        });
    }, 60 * 60 * 1000); // Every hour

    // Register disposables
    context.subscriptions.push(
        changeTracker,
        statusBarItem,
        { dispose: () => clearInterval(rotationInterval) }
    );

    // Update services when configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('aiCodeAnalyzer')) {
            logger.updateConfiguration();
        }
    });

    console.log('AI Code Analyzer extension initialized successfully');
}

function registerCommands(context: vscode.ExtensionContext) {
    // Show AI Attribution Report
    const showReportCommand = vscode.commands.registerCommand('ai-analyzer.showReport', async () => {
        try {
            const panel = vscode.window.createWebviewPanel(
                'aiAnalyzerReport',
                'AI Code Analysis Report',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const reportHtml = await generateReportHtml();
            panel.webview.html = reportHtml;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
        }
    });

    // Analyze Current File
    const analyzeCurrentFileCommand = vscode.commands.registerCommand('ai-analyzer.analyzeCurrentFile', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active file to analyze');
                return;
            }

            const fileUri = editor.document.uri.toString();
            const changes = await logger.getChangeEventsForFile(fileUri);

            if (changes.length === 0) {
                vscode.window.showInformationMessage('No changes recorded for this file yet');
                return;
            }

            // Analyze AI attribution
            const aiAttribution = await aiDetectionService.analyze(changes);

            // Analyze review quality
            const reviewQuality = await reviewAnalyzer.assessQuality(changes);

            // Update status bar
            updateStatusBar(aiAttribution, reviewQuality);

            // Show analysis results
            const message = `File Analysis Results:
AI Probability: ${(aiAttribution.aiProbability * 100).toFixed(1)}%
Source: ${aiAttribution.source}
Review Quality: ${reviewQuality.qualityLevel} (${reviewQuality.overallScore}/10)
Confidence: ${(aiAttribution.confidence * 100).toFixed(1)}%`;

            vscode.window.showInformationMessage(message, 'View Details').then(selection => {
                if (selection === 'View Details') {
                    vscode.commands.executeCommand('ai-analyzer.showReport');
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
    });

    // Generate Commit Summary
    const generateCommitSummaryCommand = vscode.commands.registerCommand('ai-analyzer.generateCommitSummary', async () => {
        try {
            // This would integrate with git to analyze staged files
            vscode.window.showInformationMessage('Commit summary generation coming soon!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate commit summary: ${error}`);
        }
    });

    // Show Change Timeline
    const showTimelineCommand = vscode.commands.registerCommand('ai-analyzer.showChangeTimeline', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active file to show timeline for');
                return;
            }

            const fileUri = editor.document.uri.toString();
            const changes = await logger.getChangeEventsForFile(fileUri);

            if (changes.length === 0) {
                vscode.window.showInformationMessage('No changes recorded for this file yet');
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'aiAnalyzerTimeline',
                'Change Timeline',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = generateTimelineHtml(changes);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show timeline: ${error}`);
        }
    });

    // Export Metrics
    const exportMetricsCommand = vscode.commands.registerCommand('ai-analyzer.exportMetrics', async () => {
        try {
            const csv = await logger.exportMetricsAsCSV();

            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('ai-code-metrics.csv'),
                filters: {
                    'CSV Files': ['csv']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf8'));
                vscode.window.showInformationMessage(`Metrics exported to ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    });

    // Register all commands
    context.subscriptions.push(
        showReportCommand,
        analyzeCurrentFileCommand,
        generateCommitSummaryCommand,
        showTimelineCommand,
        exportMetricsCommand
    );
}

function updateStatusBar(aiAttribution: any, reviewQuality: any) {
    const aiPercentage = Math.round(aiAttribution.aiProbability * 100);
    const reviewScore = reviewQuality.overallScore;

    let icon = '$(robot)';
    if (aiAttribution.source === 'human') {
        icon = '$(person)';
    } else if (aiAttribution.source === 'mixed') {
        icon = '$(organization)';
    }

    statusBarItem.text = `${icon} ${aiPercentage}% AI | Review: ${reviewScore}/10`;
    statusBarItem.tooltip = `AI Attribution: ${aiAttribution.source} (${aiPercentage}%)\nReview Quality: ${reviewQuality.qualityLevel} (${reviewScore}/10)`;
}

async function generateReportHtml(): Promise<string> {
    // Get recent analysis data
    const commits = await logger.getAllCommitAnalyses();
    const recentCommits = commits.slice(-10); // Last 10 commits

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Code Analysis Report</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 20px;
                margin-bottom: 20px;
            }
            .metric-card {
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 16px;
            }
            .metric-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: var(--vscode-textLink-foreground);
            }
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 4px;
            }
            .metric-description {
                font-size: 14px;
                opacity: 0.8;
            }
            .commit-list {
                list-style: none;
                padding: 0;
            }
            .commit-item {
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 12px;
                margin-bottom: 8px;
            }
            .commit-message {
                font-weight: bold;
                margin-bottom: 4px;
            }
            .commit-stats {
                font-size: 14px;
                opacity: 0.8;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>AI Code Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="metric-card">
            <div class="metric-title">Recent Activity</div>
            <div class="metric-value">${recentCommits.length}</div>
            <div class="metric-description">Commits analyzed in the last session</div>
        </div>

        <div class="metric-card">
            <div class="metric-title">Log Directory</div>
            <div class="metric-description">
                Detailed logs are stored in: <code>${logger.getLogDirectory()}</code>
            </div>
        </div>

        <h2>Recent Commits</h2>
        <ul class="commit-list">
            ${recentCommits.map(commit => `
                <li class="commit-item">
                    <div class="commit-message">${commit.message}</div>
                    <div class="commit-stats">
                        AI Contribution: ${commit.commitMetrics?.aiContributionPercentage?.toFixed(1) || 0}% | 
                        Review Quality: ${commit.commitQuality?.overallScore?.toFixed(1) || 0}/10 |
                        Files: ${commit.fileAnalysis?.length || 0}
                    </div>
                </li>
            `).join('')}
        </ul>

        <div class="metric-card">
            <div class="metric-title">Data Export</div>
            <div class="metric-description">
                Use the "Export Metrics" command to export all data for external analysis.
            </div>
        </div>
    </body>
    </html>
    `;
}

function generateTimelineHtml(changes: any[]): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Change Timeline</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 20px;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .timeline {
                position: relative;
                padding-left: 30px;
            }
            .timeline::before {
                content: '';
                position: absolute;
                left: 15px;
                top: 0;
                bottom: 0;
                width: 2px;
                background-color: var(--vscode-panel-border);
            }
            .timeline-item {
                position: relative;
                margin-bottom: 20px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                padding: 12px;
            }
            .timeline-item::before {
                content: '';
                position: absolute;
                left: -23px;
                top: 15px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: var(--vscode-textLink-foreground);
            }
            .change-type {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .timestamp {
                font-size: 12px;
                opacity: 0.7;
                margin-bottom: 4px;
            }
            .content-preview {
                font-family: 'Courier New', monospace;
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 3px;
                padding: 8px;
                margin-top: 8px;
                font-size: 12px;
                max-height: 100px;
                overflow-y: auto;
            }
        </style>
    </head>
    <body>
        <h1>Change Timeline</h1>
        <div class="timeline">
            ${changes.map(change => `
                <div class="timeline-item">
                    <div class="timestamp">${new Date(change.timestamp).toLocaleString()}</div>
                    <div class="change-type">${change.changeType.toUpperCase()}</div>
                    <div>Length: ${change.contentLength} chars | Speed: ${change.instantTypingSpeed} CPM</div>
                    ${change.externalToolSignature?.detected ?
            `<div style="color: orange;">🤖 External tool detected: ${change.externalToolSignature.toolType}</div>` :
            ''
        }
                    ${change.content.length > 0 ?
            `<div class="content-preview">${change.content.substring(0, 200)}${change.content.length > 200 ? '...' : ''}</div>` :
            ''
        }
                </div>
            `).join('')}
        </div>
    </body>
    </html>
    `;
}

export function deactivate() {
    console.log('AI Code Analyzer extension deactivated');
}
