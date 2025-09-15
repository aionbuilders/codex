# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@killiandvcz/codex** is a Svelte 5 library implementing a sophisticated rich text editor with a modular block-based architecture. It uses modern Svelte runes for reactive state management and provides a ContentEditable-based editing experience with custom behavior handling.

## Development Commands

### Primary Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build the library for production (includes prepack)
- `npm run preview` - Preview the production build
- `npm run prepack` - Sync SvelteKit and package the library using svelte-package
- `npm run check` - Run Svelte type checking
- `npm run check:watch` - Run Svelte type checking in watch mode

### Notes
- Uses JavaScript with JSDoc for type annotations (no TypeScript compilation)
- Built as a SvelteKit library using `@sveltejs/package`
- Package exports are configured in `package.json` exports field

## Core Architecture

### Block System Hierarchy
The editor uses a hierarchical block system:
- `Block` (base class) - Core reactive block with coordinate system
- `MegaBlock extends Block` - Container blocks that can hold children
- `Codex extends MegaBlock` - Root editor instance
- `Paragraph extends MegaBlock` - Text container blocks
- `Text extends Block` - Leaf text content blocks
- `Linebreak extends Block` - Line break elements

### State Management with Svelte 5 Runes
- Uses modern Svelte 5 `$state`, `$derived`, and `$effect` runes
- Reactive coordinate system where each block tracks `start`/`end` positions
- Selection state managed through `CodexSelection` wrapper around native Selection API
- History system using custom `History` class extending `SvelteSet`

### Strategy Pattern for Behaviors
Complex editing behaviors are handled through a strategy system:
- `Strategy` class with `canHandle()` and `execute()` methods
- Strategies are tagged (e.g., 'keydown', 'beforeinput', 'delete')
- Event handling ascends through parent blocks to find appropriate strategy
- Located in `src/lib/states/strategies/` and `src/lib/states/blocks/strategies/`

### Operation/Transaction System
All mutations go through a command pattern:
- `Operation` - Individual atomic changes to blocks
- `Transaction` - Groups operations with rollback capability
- Transactions are added to history for undo/redo functionality
- Block methods like `prepareEdit()`, `prepareInsert()`, `prepareRemove()` return operations

## Key File Locations

### Core State Management
- `src/lib/states/codex.svelte.js` - Main Codex class and initialization
- `src/lib/states/history.svelte.js` - Transaction history management
- `src/lib/states/selection.svelte.js` - Selection state wrapper
- `src/lib/states/block.svelte.js` - Base Block and MegaBlock classes

### Block Implementations
- `src/lib/states/blocks/paragraph.svelte.js` - Paragraph container block
- `src/lib/states/blocks/text.svelte.js` - Text content block
- `src/lib/states/blocks/linebreak.svelte.js` - Linebreak block

### Operations & Utilities
- `src/lib/utils/operations.utils.js` - Operation, Transaction, and executor utilities
- `src/lib/utils/block.utils.js` - Block manipulation utilities
- `src/lib/states/blocks/operations/` - Block-specific operation definitions

### Components (Svelte UI)
- `src/lib/components/Codex.svelte` - Main editor component
- `src/lib/components/Paragraph.svelte` - Paragraph rendering
- `src/lib/components/Text.svelte` - Text rendering
- `src/lib/debug/` - Debug panel components

## Current Development Status

According to `state.md`, this is a work-in-progress v1.0 editor with:

### Completed ✅
- Modular block architecture with Svelte 5 runes
- Basic paragraph/text/linebreak editing
- Single ContentEditable management
- Selection tracking and basic keyboard navigation
- Strategy pattern for complex behaviors
- Transaction system with rollback

### In Progress 🚧
- Multi-block selection and operations
- Copy/paste functionality
- Text formatting (bold, italic, underline)
- Undo/redo system
- Public API for integration

### Important Implementation Notes
- Uses a single ContentEditable for the entire editor
- Coordinates are managed reactively - blocks track absolute `start`/`end` positions
- Selection can span multiple blocks (isMultiBlock detection)
- All DOM mutations must go through the operation system
- Strategies handle complex multi-block operations like deletion across boundaries

## Working with the Codebase

### Adding New Block Types
1. Create new block class extending `Block` or `MegaBlock` in `src/lib/states/blocks/`
2. Add corresponding Svelte component in `src/lib/components/`
3. Register in `initialBlocks` and `initialComponents` in `codex.svelte.js`
4. Add operations in `src/lib/states/blocks/operations/`

### Adding New Behaviors
1. Create strategies in `src/lib/states/blocks/strategies/` or `src/lib/states/strategies/`
2. Tag appropriately ('keydown', 'beforeinput', etc.)
3. Register in block's strategies array or global `initialStrategies`

### Debugging
- Use the built-in debug panel components in `src/lib/debug/`
- Each block has a `debug` derived property for inspection
- Transaction results are logged during execution
- MutationObserver tracks DOM changes for selection updates

## Architecture Principles

1. **Single ContentEditable**: One contenteditable manages all content
2. **Reactive Coordinates**: Block positions update automatically via runes
3. **Command Pattern**: All mutations through operations/transactions
4. **Strategy Pattern**: Complex behaviors handled by tagged strategies
5. **Block Hierarchy**: Clear parent/child relationships with coordinate inheritance
6. **Separation of Concerns**: State logic separate from UI components