# AI Code Analyzer - Human Preface

## High Level Summary
This is an exploration of profiling file changes to identify LLM code production and modifications. This is not meant to be used in any way other than exploratory. At a super high level: 
1. The extension logs out metrics on each "change" aka local history point in vs code. This is logged out into the `/.vscode` folder in the workspace as change-events.jsonl. 
2. There's of features that can then be calculated off of these raw events to quantify whether or not the typing was extremely fast. There's a web app that you can use to visualise these for each bucket of changes. 

I've dabbled with a few other ideas around how to create summaries of all the prior changes at the point of a commit. I think realistically though you'd want to be blasting sanitised `change-events.jsonl` to a remote endpoint and doing all the classification work on there. 

My takeaway from this is that with a bit of time you 100% could very thoroughly classify individual changes as purely LLM or not. Currently (Jun 5th 2025) different LLMs have very different profiles in how the edits take place. Gemini 2.5 Flash  vs Claude 4 Sonnet edit files in very different ways. 

None of these features are tuned, if you open the web app crank the weighting of typing speed to the moon. 

## Demos
Here's a gif of the Web App Analysing a session
![web_app_demo](./assets/web_app_demo.gif)

Here's gif of the changes I'm typing now being logged out into `./vscode/ai-code-analyzer/change-events.jsonl`
![change_file_demo](./assets/change_file_demo.gif)

## Claude Credit 
I don't think I wrote a line of code in this it's pretty much all Cline with Calude Sonnet 4 and about $15 dollary doos of tokens. 

Learnings from that:
1. ROADMAP.md is amazing for having a shared persistence of state between tasks in a token cost effective way. I'm 100% doing that again. 
2. Once you have BUG_LOG.md it'll auto update it whenever it fixes a bug. It's a bit wild on it's classification and the LLM always thinks it's January 6th like it's in some memento loop. 

Claude is insane at coding compared to google's model. Like claude with the right feedback loops just works - it's mind blowing. 

# AI Below...


AI code analysis platform consisting of a VSCode extension and Next.js web application, sharing a common core library. This project analyzes code changes to understand AI vs human contribution and review quality, helping developers and engineering managers gain insights into their development practices.

## 🏗️ Architecture

This project uses a **monorepo architecture** with three independent packages:

```
ai-code-analyzer/
├── packages/
│   ├── core/                    # 📦 Shared business logic & types
│   │   ├── src/types/          # Unified TypeScript interfaces
│   │   ├── src/services/       # AI detection algorithms
│   │   ├── src/models/         # Data models
│   │   └── src/utils/          # Shared utilities
│   ├── extension/              # 🔌 VSCode extension (independent)
│   │   ├── src/services/       # VSCode-specific services
│   │   ├── src/extension.ts    # Main extension entry
│   │   └── out/               # Compiled extension
│   └── web-app/               # 🌐 Next.js application (independent)
│       ├── src/app/           # App router pages
│       ├── src/components/    # React components
│       ├── src/lib/          # State management & utilities
│       └── .next/            # Next.js build output
├── package.json               # Root workspace configuration
└── ROADMAP.md                # Development roadmap
```

### Key Benefits
- ✅ **Independent Compilation**: Extension builds standalone without web app
- ✅ **Shared Codebase**: Eliminates duplication, ensures consistency
- ✅ **Modern Framework**: Next.js for better performance and developer experience
- ✅ **Scalable Architecture**: Easy to add new features and maintain
- ✅ **Optional Integration**: Web app enhances but doesn't require extension

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- VSCode (for extension development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-code-analyzer
   ```

2. **Install all dependencies**
   ```bash
   npm install
   ```
   This installs dependencies for all packages using npm workspaces.

3. **Build all packages**
   ```bash
   npm run build
   ```
   This builds the core library first, then the extension and web app.

## 🏃‍♂️ Running the Project

### Option 1: Run Everything
```bash
# Build and start all components
npm run build
npm run dev
```

### Option 2: Run Individual Components

#### VSCode Extension
```bash
# Build the extension
npm run build:extension

# Package the extension
npm run package:extension

# Install the packaged extension in VSCode
code --install-extension ai-code-analyzer-0.1.0.vsix
```

#### Next.js Web Application
```bash
# Start the web app in development mode
npm run dev:web-app

# Or build and start in production mode
npm run build:web-app
npm run start:web-app
```

#### Core Library (for development)
```bash
# Build the core library
npm run build:core

# Run tests
npm run test:core

# Watch mode for development
npm run dev:core
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests by Package
```bash
# Core library tests (60 tests)
npm run test:core

# Extension tests
npm run test:extension

# Web app tests
npm run test:web-app
```

### Test Coverage
```bash
npm run test:coverage
```

## 📦 Package Details

### Core Library (`@ai-analyzer/core`)
**Purpose**: Shared business logic, types, and utilities

**Key Features**:
- Zero runtime dependencies
- Pure TypeScript implementation
- Comprehensive AI detection algorithms
- 60+ unit tests with deterministic focus
- Shared data models and validation

**Usage**:
```typescript
import { AIDetectionEngine, EnhancedChangeEvent } from '@ai-analyzer/core';

const engine = new AIDetectionEngine();
const result = engine.analyzeChanges(changeEvents);
```

### VSCode Extension (`packages/extension`)
**Purpose**: VSCode integration for real-time code analysis

**Key Features**:
- Real-time AI detection and review quality assessment
- Comprehensive logging system
- Status bar integration
- Export capabilities
- Uses shared core library

**Commands**:
- `AI Analyzer: Show Report` - Display comprehensive analysis report
- `AI Analyzer: Analyze Current File` - Analyze the currently open file
- `AI Analyzer: Show Change Timeline` - View detailed change timeline
- `AI Analyzer: Export Metrics` - Export all metrics as CSV

**Development**:
```bash
# Open in VSCode for debugging
code packages/extension

# Press F5 to launch Extension Development Host
```

### Next.js Web Application (`packages/web-app`)
**Purpose**: Advanced visualization and parameter tuning interface

**Key Features**:
- Modern Next.js 14+ with App Router
- Interactive data visualization components
- Parameter tuning interface
- Zustand state management
- Custom hooks for business logic
- Uses shared core library

**Available at**: `http://localhost:3000` (when running)

**Pages**:
- `/` - Main dashboard
- `/dashboard` - Analysis dashboard (coming soon)
- `/tuning` - Parameter tuning (coming soon)

## 🔧 Development

### Project Structure

```
packages/core/src/
├── types/                    # Shared TypeScript interfaces
│   ├── ChangeEvent.ts       # Change event definitions
│   ├── AIDetection.ts       # AI detection types
│   └── index.ts             # Type exports
├── services/                # Business logic services
│   ├── AIDetectionEngine.ts # Core AI detection engine
│   └── index.ts             # Service exports
├── models/                  # Data models
│   ├── Session.ts           # Development session models
│   ├── ReviewQuality.ts     # Review quality models
│   └── index.ts             # Model exports
├── utils/                   # Utility functions
│   ├── validation.ts        # Data validation
│   ├── calculations.ts      # Statistical calculations
│   └── index.ts             # Utility exports
└── __tests__/               # Comprehensive test suite

packages/extension/src/
├── extension.ts             # Main extension entry point
├── services/                # VSCode-specific services
│   ├── AIDetectionService.ts # Extension AI detection wrapper
│   ├── ChangeTracker.ts     # File change monitoring
│   ├── ReviewAnalyzer.ts    # Review quality assessment
│   └── MetricsLogger.ts     # Comprehensive logging
└── test/                    # Extension tests

packages/web-app/src/
├── app/                     # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── DataImport.tsx      # Data import interface
│   ├── DecisionTree.tsx    # Decision tree visualization
│   ├── HeuristicRadarChart.tsx # Radar chart component
│   ├── TimelineVisualization.tsx # Timeline component
│   └── ParameterTuning.tsx # Parameter tuning interface
├── lib/                    # Application utilities
│   ├── store.ts           # Zustand state management
│   └── hooks/             # Custom React hooks
└── services/              # Web app services
    └── DataService.ts     # Data management service
```

### Adding New Features

1. **Core Library Changes**: Add shared logic to `packages/core/src/`
2. **Extension Features**: Add VSCode-specific features to `packages/extension/src/`
3. **Web App Features**: Add UI components to `packages/web-app/src/`

### Build System

The project uses npm workspaces with proper dependency management:

- **Core builds first**: Extension and web app depend on core
- **Independent packages**: Each can be built and deployed separately
- **Shared dependencies**: Common dependencies are hoisted to root
- **TypeScript references**: Proper project references for incremental builds

## 🔍 Features

### AI Detection Heuristics
- **Bulk Insertion Pattern**: Large code blocks inserted rapidly
- **Typing Speed Analysis**: Unrealistic typing speeds (>200 WPM)
- **External Tool Signatures**: Patterns specific to AI tools
- **Content Pattern Analysis**: Complete functions/classes, structured code
- **Timing Anomalies**: Long pauses followed by rapid changes

### Review Quality Indicators
- **Time Investment**: Development time before commit
- **Multiple Edit Sessions**: Evidence of returning to code
- **Incremental Refinement**: Small improvements over time
- **Commentary Addition**: Adding comments and documentation
- **Code Restructuring**: Refactoring and improvements

### External Tool Detection
- Detects file changes made outside VS Code sessions
- Identifies bulk replacements and structured edits
- Tracks handoff patterns between tools and manual editing
- Analyzes collaboration signatures

## 📊 Logging System

All metrics are logged to `.vscode/ai-code-analyzer/` in your workspace:

- `change-events.jsonl` - Raw change events with timing and context
- `ai-detection-metrics.jsonl` - AI detection analysis and decision traces
- `review-quality-metrics.jsonl` - Review assessment data
- `session-summaries.jsonl` - Development session analysis
- `commit-analysis.jsonl` - Git commit correlations

## ⚙️ Configuration

### Extension Settings
```json
{
  "aiCodeAnalyzer.enableLogging": true,
  "aiCodeAnalyzer.logLevel": "info",
  "aiCodeAnalyzer.aiDetectionSensitivity": 0.7
}
```

### Web App Configuration
The web app uses environment variables for configuration:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 🚢 Deployment

### Extension Deployment
```bash
# Package the extension
npm run package:extension

# Publish to VS Code Marketplace (requires publisher account)
vsce publish
```

### Web App Deployment
```bash
# Build for production
npm run build:web-app

# Deploy to Vercel, Netlify, or any static hosting
npm run export:web-app
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes in the appropriate package(s)
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Build all packages: `npm run build`
7. Commit changes: `git commit -m 'Add amazing feature'`
8. Push to branch: `git push origin feature/amazing-feature`
9. Submit a pull request

### Development Workflow

1. **Make changes** in the appropriate package
2. **Run tests** to ensure functionality works
3. **Build packages** to check for compilation errors
4. **Test integration** between packages if needed

## 📈 Current Status

**Phase 4 In Progress**: Next.js Migration Underway (50% Complete)

- ✅ **Phase 1**: Monorepo Setup (Completed)
- ✅ **Phase 2**: Extract Shared Core Library (Completed)
- ✅ **Phase 3**: Refactor VSCode Extension (Completed)
- 🚧 **Phase 4**: Migrate Web App to Next.js (In Progress)
- ⏳ **Phase 5**: Enhanced Architecture (Pending)
- ⏳ **Phase 6**: Testing & Validation (Pending)

See [ROADMAP.md](ROADMAP.md) for detailed progress tracking.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and feature requests, please use the GitHub issue tracker.

## 📚 Documentation

For detailed project documentation, see the [`docs/`](docs/) directory:

- **[Development Roadmap](docs/development/ROADMAP.md)** - Current progress and migration phases
- **[Bug Reports](docs/issues/BUG_LOG.md)** - Known issues and resolutions
- **[Phase Completion Reports](docs/development/)** - Detailed completion summaries for each development phase

## 🗺️ Roadmap

See [docs/development/ROADMAP.md](docs/development/ROADMAP.md) for the complete development roadmap.

**Current Status**: Phase 4 (Next.js Migration) - 50% Complete

- ✅ **Phase 1**: Monorepo Setup (Completed)
- ✅ **Phase 2**: Core Library Extraction (Completed)
- ✅ **Phase 3**: VSCode Extension Refactor (Completed)
- 🚧 **Phase 4**: Next.js Migration (In Progress)
- ⏳ **Phase 5**: Enhanced Architecture (Pending)
- ⏳ **Phase 6**: Testing & Validation (Pending)
