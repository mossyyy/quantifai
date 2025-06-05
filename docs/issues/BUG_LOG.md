# Bug Log - AI Code Analyzer

## Overview
This document tracks bugs and issues found in the AI Code Analyzer project. Each bug is assigned a unique ID and includes detailed information for tracking and resolution.

---

## Bug #001: Timeline Component Axis Display Issues

**Status:** Closed  
**Priority:** High  
**Severity:** Major  
**Component:** `packages/web-app/src/components/TimelineVisualization.tsx`  
**Reporter:** Development Team  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
The timeline component doesn't show meaningful Y or X axis labels, making the visualization difficult to interpret.

### Issues Identified
- X-axis lacks proper time formatting in local time
- Y-axis usage is not sensible/meaningful
- Time display is unclear or missing

### Expected Behavior
- X-axis should display time in local time format with clear labels
- Y-axis should be used sensibly based on the data being visualized
- Time formatting should be human-readable and contextually appropriate

### Acceptance Criteria
- [x] X-axis displays time in local timezone
- [x] Time labels are clearly formatted and readable
- [x] Y-axis represents meaningful data metrics
- [x] Axis labels are descriptive and helpful

### Resolution
- Enhanced timeline component with proper X and Y axis labels
- X-axis now shows local time with clear formatting (HH:MM:SS)
- Y-axis represents content size in characters with grid lines
- Added descriptive axis labels and improved visual layout
- Events are now plotted as scatter points showing both time and content size

---

## Bug #002: Inconsistent Risk Assessment Display

**Status:** Closed  
**Priority:** Medium  
**Severity:** Major  
**Component:** Report Display/Risk Assessment UI  
**Reporter:** Development Team  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
Risk assessment information shows conflicting or unclear data presentation with different values that aren't properly explained.

### Current Problematic Display
```
Risk Assessment: Low
Patterns consistent with human coding 

Source: MIXED
Confidence: 80.0%
AI Probability: 80.1%
Evidence Count: 12789

Final Assessment
Risk Level: MEDIUM RISK
Based on the analysis of 13353 events using the current detection thresholds.
```

### Issues Identified
- Initial "Risk Assessment: Low" conflicts with "Final Assessment: MEDIUM RISK"
- Different evidence counts (12789 vs 13353) without explanation
- Unclear why confidence and AI probability differ
- No clear labeling explaining the differences

### Expected Behavior
- Consistent risk level reporting OR clear explanation of why they differ
- Unified evidence counting OR explanation of different count sources
- Clear labeling to explain what each metric represents

### Acceptance Criteria
- [x] Risk levels are consistent or clearly explained
- [x] Evidence counts are unified or differences are documented
- [x] All metrics have clear labels explaining their purpose
- [x] No conflicting information without proper context

### Resolution
- Separated AI Detection Engine results from Decision Tree assessment with clear labeling
- Added explanatory text for each assessment method
- Included comparison section explaining the differences between methodologies
- Clarified that different methods may produce different results
- Added descriptive labels for all metrics and evidence counts

---

## Bug #003: Weight Balancing Auto-Adjustment Missing

**Status:** Closed  
**Priority:** Medium  
**Severity:** Minor  
**Component:** `packages/web-app/src/components/ParameterTuning.tsx`  
**Reporter:** Development Team  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
Weight balancing controls don't automatically adjust other weights when one is modified, causing weights to not sum to 1.

### Current Behavior
- User can slide one weight up without other weights adjusting
- Total weights may exceed or fall below 1.0
- Manual adjustment of each weight required

### Expected Behavior
- When one weight is increased, others should automatically decrease proportionally
- When one weight is decreased, others should automatically increase proportionally
- Total weights should always sum to 1.0

### Acceptance Criteria
- [x] Sliding one weight up automatically balances others down
- [x] Sliding one weight down automatically balances others up
- [x] Total weights always equal 1.0
- [x] Proportional adjustment maintains relative relationships where possible

### Resolution
- Implemented automatic weight balancing in handleWeightChange function
- When one weight is adjusted, other weights are proportionally scaled to maintain sum of 1.0
- Added logic to handle edge cases like zero weights and single weight scenarios
- Ensures total weights always equal exactly 1.0 with precision adjustment

---

## Bug #004: Missing Documentation for Threshold Controls

**Status:** Closed  
**Priority:** Low  
**Severity:** Minor  
**Component:** UI Documentation/Help Text  
**Reporter:** Development Team  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
Heuristic weights, detection thresholds, and classification thresholds lack explanatory text describing their functionality.

### Missing Documentation Areas
- Heuristic weights: No description of how they work
- Detection thresholds: No explanation of their purpose
- Classification thresholds: No description of their function

### Expected Behavior
- Each control section should have a short, clear description
- Descriptions should explain how the controls affect the analysis
- Help text should be accessible and contextually relevant

### Acceptance Criteria
- [x] Heuristic weights have descriptive blurb explaining their function
- [x] Detection thresholds have clear explanation of their purpose
- [x] Classification thresholds have description of how they work
- [x] All descriptions are concise but informative
- [x] Help text is easily accessible to users

### Resolution
- Added comprehensive documentation sections for all parameter categories
- Heuristic weights now include explanation of weighted contribution to AI probability
- Detection thresholds have clear descriptions of sensitivity levels
- Classification thresholds explain how scores are categorized into risk levels
- All help text is prominently displayed in gray boxes above each section

---

## Bug #005: Missing Feature Descriptions

**Status:** Closed  
**Priority:** Low  
**Severity:** Minor  
**Component:** Feature Documentation/UI  
**Reporter:** Development Team  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
Individual features lack descriptions explaining how they are calculated and what they represent.

### Current State
- Features are displayed without explanatory text
- Users cannot understand what each feature measures
- No information about calculation methodology

### Expected Behavior
- Each feature should have a short description
- Descriptions should explain what the feature measures
- Calculation methodology should be briefly described
- Information should be accessible via tooltips or help sections

### Acceptance Criteria
- [x] Each feature has a descriptive explanation
- [x] Descriptions explain what the feature measures
- [x] Calculation methodology is briefly documented
- [x] Information is easily accessible to users
- [x] Descriptions are technically accurate but user-friendly

### Resolution
- Added detailed descriptions for all heuristic features
- Each feature now includes explanation of what it measures and how it's calculated
- Descriptions cover bulk insertion, typing speed, paste patterns, external tools, content patterns, and timing anomalies
- Information is displayed directly below each feature label for easy access
- Descriptions are technically accurate but written in user-friendly language

---

## Bug #006: File Input Not Reset After Upload Error

**Status:** Closed  
**Priority:** Medium  
**Severity:** Major  
**Component:** `packages/web-app/src/components/DataImport.tsx`  
**Reporter:** User  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
After uploading a file that results in an error (such as "No valid change events found"), users cannot select a new file because the file input is not reset. This prevents users from trying different files or re-uploading the same file after making corrections.

### Current Problematic Behavior
- User uploads a file that fails validation
- Error message is displayed correctly
- File input retains the previous file selection
- Clicking "Choose JSONL File" button does nothing because the same file is already selected
- User cannot upload a different file or retry the same file

### Root Cause
In the `handleFileUpload` function, when an error occurs (like no valid events found), the function returns early before reaching the file input reset code in the `finally` block. The file input reset was only happening in the `finally` block, which wasn't reached when early returns occurred.

### Expected Behavior
- File input should be reset after every upload attempt, regardless of success or failure
- Users should be able to select the same file again after an error
- Users should be able to select different files after any upload attempt

### Acceptance Criteria
- [x] File input is reset after successful uploads
- [x] File input is reset after failed uploads
- [x] File input is reset after validation errors
- [x] Users can re-select the same file after an error
- [x] Users can select different files after any upload attempt

### Resolution
- Moved the file input reset code outside of the `finally` block
- File input is now reset after every upload attempt, regardless of the outcome
- Added comment explaining the purpose of always resetting the file input
- This ensures users can always select new files or retry the same file after any upload attempt

---

## Bug Status Legend

- **Open:** Bug has been identified and needs to be addressed
- **In Progress:** Bug is currently being worked on
- **Testing:** Fix has been implemented and is being tested
- **Closed:** Bug has been resolved and verified

## Priority Levels

- **High:** Critical functionality affected, immediate attention required
- **Medium:** Important functionality affected, should be addressed soon
- **Low:** Minor issues, can be addressed in regular development cycle

## Severity Levels

- **Critical:** System unusable or data loss possible
- **Major:** Major functionality broken or severely impacted
- **Minor:** Minor functionality affected or cosmetic issues
- **Trivial:** Very minor issues with minimal impact

---

## Bug #007: File Selection Hangs and Crashes

**Status:** Closed  
**Priority:** Critical  
**Severity:** Critical  
**Component:** Multiple components - File processing and analysis pipeline  
**Reporter:** User  
**Date Reported:** 2025-01-06  
**Date Resolved:** 2025-01-06  

### Description
Application hangs or crashes when selecting specific files from changes, particularly with large files or when adjusting parameters during file processing.

### Root Causes Identified

#### 1. Infinite Re-analysis Loop (Critical)
- **Location:** `packages/web-app/src/app/page.tsx`
- **Issue:** useEffect dependency array included `analyzeEvents` function which was recreated on every render
- **Impact:** Infinite re-analysis loops causing browser hangs and excessive CPU usage

#### 2. Memory Issues with Large Files
- **Location:** `packages/web-app/src/services/DataService.ts`
- **Issue:** Entire file content loaded into memory synchronously
- **Impact:** Browser crashes with large JSONL files, UI freezing

#### 3. UI Blocking File Operations
- **Location:** `packages/web-app/src/components/DataImport.tsx`
- **Issue:** File reading blocked the main thread
- **Impact:** Unresponsive interface during file processing

#### 4. Excessive Re-renders from Config Changes
- **Location:** `packages/web-app/src/lib/hooks/useAIDetection.ts`
- **Issue:** AI engine recreated on every config change
- **Impact:** Performance degradation, unnecessary computations

### Expected Behavior
- File selection should work smoothly without hangs or crashes
- Large files should be processed without blocking the UI
- Parameter changes should not cause excessive re-analysis
- Memory usage should remain reasonable during file processing

### Acceptance Criteria
- [x] File selection works without infinite loops
- [x] Large files (up to 50MB) can be processed without crashes
- [x] UI remains responsive during file processing
- [x] Parameter changes are debounced to prevent excessive re-analysis
- [x] Memory usage is optimized with streaming file processing
- [x] Progress indicators show file processing status
- [x] File size limits prevent memory issues

### Resolution

#### Fix 1: Removed Infinite Loop
- Removed `analyzeEvents` from useEffect dependency array in `page.tsx`
- Analysis now only triggers on dataset or config changes, not function recreation

#### Fix 2: Implemented Streaming File Processing
- Added `parseJSONLFileStreaming` method for large files (>1MB)
- Implemented chunked processing with progress reporting
- Added `setTimeout(0)` to yield control and prevent UI blocking

#### Fix 3: Added File Size Limits and Progress Indicators
- Implemented 50MB file size limit with clear error messages
- Added progress bar for large file processing
- Enhanced error handling and user feedback

#### Fix 4: Optimized AI Detection Hook
- AI engine now created once and updated via `updateConfig()` method
- Eliminated unnecessary engine recreation on config changes
- Improved performance and reduced memory usage

#### Fix 5: Added Parameter Change Debouncing
- Implemented 300ms debouncing for parameter changes
- Prevents excessive re-analysis during rapid parameter adjustments
- Maintains responsive UI while reducing computational overhead

### Technical Details
- **File Size Limit:** 50MB maximum
- **Streaming Threshold:** Files >1MB use streaming processing
- **Debounce Delay:** 300ms for parameter changes
- **Progress Reporting:** Real-time progress bar for large files
- **Memory Optimization:** Chunked processing with automatic garbage collection

### Testing Scenarios
- ✅ Upload small files (<1MB) - processed normally
- ✅ Upload large files (1-50MB) - streaming with progress
- ✅ Upload oversized files (>50MB) - rejected with clear error
- ✅ Rapid parameter adjustments - debounced properly
- ✅ File processing during parameter changes - no conflicts
- ✅ Browser memory usage - remains stable during large file processing

---
