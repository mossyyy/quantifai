# AI Code Analyzer Documentation

This directory contains all project documentation organized by category.

## 📁 Directory Structure

### 📋 Main Documentation
- [`../README.md`](../README.md) - Main project README with setup instructions and architecture overview

### 🚀 Development Documentation (`development/`)
- [`ROADMAP.md`](development/ROADMAP.md) - Project roadmap and migration phases
- [`PHASE_1_COMPLETION.md`](development/PHASE_1_COMPLETION.md) - Monorepo setup completion summary
- [`PHASE_2_COMPLETION.md`](development/PHASE_2_COMPLETION.md) - Core library extraction completion summary  
- [`PHASE_3_COMPLETION.md`](development/PHASE_3_COMPLETION.md) - VSCode extension refactor completion summary

### 🐛 Issue Tracking (`issues/`)
- [`BUG_LOG.md`](issues/BUG_LOG.md) - Comprehensive bug tracking and resolution log
- [`HANG_CRASH_ANALYSIS.md`](issues/HANG_CRASH_ANALYSIS.md) - Analysis of file selection hang/crash issues

### 📦 Package Documentation
- [`../packages/web-app/README.md`](../packages/web-app/README.md) - Next.js web application documentation

### 🗄️ Archive (`archive/`)
- [`test.md`](archive/test.md) - Test file with environment variables (archived)

## 📖 Quick Navigation

### For New Contributors
1. Start with the main [`README.md`](../README.md) for project overview
2. Review [`ROADMAP.md`](development/ROADMAP.md) for current development status
3. Check [`BUG_LOG.md`](issues/BUG_LOG.md) for known issues

### For Development
- **Current Status**: See [`ROADMAP.md`](development/ROADMAP.md) - Phase 4 (Next.js Migration) in progress
- **Architecture**: Monorepo with shared core library, independent extension and web app
- **Issues**: Check [`issues/`](issues/) directory for bug reports and analyses

### For Troubleshooting
- **Known Bugs**: [`BUG_LOG.md`](issues/BUG_LOG.md)
- **Performance Issues**: [`HANG_CRASH_ANALYSIS.md`](issues/HANG_CRASH_ANALYSIS.md)

## 🏗️ Project Architecture

```
ai-code-analyzer/
├── docs/                           # 📚 All documentation (this directory)
│   ├── development/               # 🚀 Development tracking
│   ├── issues/                    # 🐛 Bug reports and analyses  
│   └── archive/                   # 🗄️ Archived/temporary files
├── packages/
│   ├── core/                      # 📦 Shared business logic & types
│   ├── extension/                 # 🔌 VSCode extension
│   └── web-app/                   # 🌐 Next.js application
├── assets/                        # 🎨 Demo GIFs and media
└── README.md                      # 📋 Main project documentation
```

## 📊 Development Progress

- ✅ **Phase 1**: Monorepo Setup (Completed)
- ✅ **Phase 2**: Core Library Extraction (Completed)  
- ✅ **Phase 3**: VSCode Extension Refactor (Completed)
- 🚧 **Phase 4**: Next.js Migration (In Progress - 50% Complete)
- ⏳ **Phase 5**: Enhanced Architecture (Pending)
- ⏳ **Phase 6**: Testing & Validation (Pending)

## 🔗 External Links

- [VSCode Extension Development](https://code.visualstudio.com/api)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
