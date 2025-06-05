import { jest } from '@jest/globals';

// Mock VS Code API
export const mockVSCode = {
    workspace: {
        fs: {
            stat: jest.fn(),
            readFile: jest.fn(),
            writeFile: jest.fn(),
            appendFile: jest.fn(),
            mkdir: jest.fn(),
            readdir: jest.fn(),
            unlink: jest.fn(),
            rename: jest.fn()
        },
        onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
        onDidOpenTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
        onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
        onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
        onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string, defaultValue?: any) => {
                const config: { [key: string]: any } = {
                    'enableLogging': true,
                    'logLevel': 'info',
                    'aiDetectionSensitivity': 0.7
                };
                return config[key] ?? defaultValue;
            })
        })),
        workspaceFolders: [{
            uri: {
                fsPath: '/mock/workspace',
                toString: () => 'file:///mock/workspace'
            }
        }]
    },
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showSaveDialog: jest.fn(),
        createStatusBarItem: jest.fn(() => ({
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        })),
        createWebviewPanel: jest.fn(() => ({
            webview: { html: '' },
            dispose: jest.fn()
        })),
        activeTextEditor: {
            document: {
                uri: {
                    toString: () => 'file:///mock/test.ts',
                    fsPath: '/mock/test.ts',
                    scheme: 'file'
                },
                fileName: '/mock/test.ts',
                languageId: 'typescript',
                lineAt: jest.fn(() => ({ text: '    const test = 1;' }))
            },
            selection: {
                active: { line: 0, character: 0 },
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
                isEmpty: true
            }
        },
        onDidChangeWindowState: jest.fn(() => ({ dispose: jest.fn() })),
        state: { focused: true }
    },
    Uri: {
        file: (path: string) => ({
            fsPath: path,
            toString: () => `file://${path}`,
            scheme: 'file'
        })
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3
    },
    commands: {
        registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
        executeCommand: jest.fn()
    },
    ExtensionContext: jest.fn(),
    Disposable: jest.fn()
};

// Mock the entire vscode module
const vscode = mockVSCode;
export default vscode;

// For CommonJS compatibility
module.exports = mockVSCode;
