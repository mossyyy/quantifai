'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DataService } from '@/services/DataService';
import type { EnhancedChangeEvent } from '@ai-analyzer/core';

const DataImport: React.FC = () => {
    const { loadDataset, setError, setIsLoading, isLoading } = useAppStore();
    const [localError, setLocalError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File size limit: 50MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            setLocalError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setIsLoading(true);
        setLocalError(null);
        setError(null);
        setUploadProgress(0);

        try {
            if (file.name.endsWith('.jsonl')) {
                let events: EnhancedChangeEvent[];

                // Use streaming for larger files (>1MB)
                if (file.size > 1024 * 1024) {
                    setLocalError('Processing large file...');
                    events = await DataService.parseJSONLFileStreaming(file, (progress) => {
                        setUploadProgress(progress);
                    });
                } else {
                    // Use regular parsing for smaller files
                    const content = await file.text();
                    events = await DataService.parseJSONLFile(content);
                }

                if (events.length === 0) {
                    setLocalError('No valid change events found in the file. Make sure the file contains change events or review quality metrics with editTimeline data.');
                    return;
                }

                loadDataset(events, file.name);
                setLocalError(null); // Clear any processing messages
            } else {
                setLocalError('Please upload a .jsonl file');
            }
        } catch (err) {
            setLocalError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }

        // Always reset file input to allow re-selection of the same file or different files
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data Import</h3>


            {/* File Upload Section */}
            <div className="mb-6">
                <div className="flex items-center mb-2">
                    <Upload className="h-4 w-4 text-gray-500 mr-2" />
                    <h4 className="text-sm font-medium text-gray-900">Upload JSONL File</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                    Upload your own review quality metrics or change event logs:
                </p>
                <div className="space-y-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jsonl"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Choose JSONL File
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center mb-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm text-blue-700">Loading data...</span>
                    </div>
                    {uploadProgress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {localError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">Error: {localError}</p>
                </div>
            )}

            {/* Info Section */}
            <div className="text-xs text-gray-500 space-y-2">
                <div>
                    <h4 className="font-medium text-gray-700 mb-1">Supported Formats:</h4>
                    <ul className="space-y-1">
                        <li>• <strong>JSONL:</strong> Review quality metrics from your AI detection extension</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-medium text-gray-700 mb-1">File Location:</h4>
                    <p className="mb-1">Your extension logs are typically saved to:</p>
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                        .vscode/ai-code-analyzer/review-quality-metrics.jsonl
                    </code>
                </div>
            </div>
        </div>
    );
};

export default DataImport;
