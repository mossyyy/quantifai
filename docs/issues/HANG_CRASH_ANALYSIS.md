# File Selection Hang/Crash Analysis

## Root Causes Identified

### 1. Infinite Re-analysis Loop (Critical)
**File:** `packages/web-app/src/app/page.tsx`
**Issue:** The useEffect dependency array includes `analyzeEvents` which is recreated on every render, causing infinite re-analysis loops.

**Current Code:**
```typescript
useEffect(() => {
  if (currentDataset?.events) {
    analyzeEvents(currentDataset.events);
  }
}, [currentDataset, aiDetectionConfig, analyzeEvents]); // ❌ analyzeEvents causes infinite loop
```

**Fix:** Remove `analyzeEvents` from dependencies and use useCallback properly:
```typescript
useEffect(() => {
  if (currentDataset?.events) {
    analyzeEvents(currentDataset.events);
  }
}, [currentDataset, aiDetectionConfig]); // ✅ Only depend on data/config changes
```

### 2. Memory Issues with Large Files
**File:** `packages/web-app/src/services/DataService.ts`
**Issue:** Entire file content is loaded into memory and processed synchronously.

**Current Code:**
```typescript
static async parseJSONLFile(content: string): Promise<EnhancedChangeEvent[]> {
  const lines = content.trim().split('\n'); // ❌ Loads entire file into memory
  // Process all lines at once
}
```

**Fix:** Implement streaming/chunked processing:
```typescript
static async parseJSONLFileStreaming(file: File): Promise<EnhancedChangeEvent[]> {
  const events: EnhancedChangeEvent[] = [];
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          // Process line...
        } catch (error) {
          console.warn('Failed to parse line:', error);
        }
      }
    }
  }
  
  return events;
}
```

### 3. UI Blocking File Operations
**File:** `packages/web-app/src/components/DataImport.tsx`
**Issue:** File reading blocks the main thread.

**Current Code:**
```typescript
const content = await file.text(); // ❌ Blocks UI thread
```

**Fix:** Use Web Workers or implement progress feedback:
```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsLoading(true);
  setLocalError(null);
  setError(null);

  try {
    // Show progress for large files
    if (file.size > 1024 * 1024) { // > 1MB
      setLocalError('Processing large file...');
    }
    
    const events = await DataService.parseJSONLFileStreaming(file);
    // ... rest of processing
  } catch (err) {
    // ... error handling
  }
};
```

### 4. Excessive Re-renders from Config Changes
**File:** `packages/web-app/src/lib/hooks/useAIDetection.ts`
**Issue:** AI engine is recreated on every config change.

**Current Code:**
```typescript
const aiEngine = useMemo(() => {
  return new AIDetectionEngine(aiDetectionConfig);
}, [aiDetectionConfig]); // ❌ Recreates engine on every config change
```

**Fix:** Update engine config instead of recreating:
```typescript
const aiEngine = useMemo(() => {
  return new AIDetectionEngine(aiDetectionConfig);
}, []); // ✅ Create once

useEffect(() => {
  aiEngine.updateConfig(aiDetectionConfig);
}, [aiDetectionConfig, aiEngine]); // ✅ Update config only
```

## Immediate Actions Required

1. **Fix the infinite loop** in `page.tsx` - this is the most critical issue
2. **Add file size limits** and progress indicators for large files
3. **Implement debouncing** for parameter changes to prevent excessive re-analysis
4. **Add error boundaries** to prevent crashes from propagating

## Testing Scenarios

To reproduce the hang/crash:
1. Upload a large JSONL file (>10MB)
2. Immediately start adjusting parameters while file is processing
3. The infinite re-analysis loop will cause browser to hang

## Performance Monitoring

Add these metrics to identify bottlenecks:
- File processing time
- Analysis execution time
- Memory usage during file processing
- Number of re-renders triggered
