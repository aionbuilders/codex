# Codex

> **The block editor that doesn't fight the browser.**  
> A revolutionary approach to rich text editing using a single ContentEditable with Svelte 5.

[![npm version](https://img.shields.io/npm/v/@aionbuilders/codex.svg)](https://www.npmjs.com/package/@aionbuilders/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/aionbuilders/codex/blob/main/LICENSE)
[![Svelte 5](https://img.shields.io/badge/Svelte-5.0-ff3e00.svg)](https://svelte.dev)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-yellow.svg)]()

---

## 🎯 Why Codex?

### The Problem with Current Editors

Every modern block editor faces the same dilemma:

1. **Multiple ContentEditables** = Broken browser behavior (selection, spellcheck, IME, accessibility)
2. **Single ContentEditable** = Complex abstraction layer fighting against the browser
3. **Virtual DOM approaches** = Performance overhead and input lag

### The Codex Solution

**One ContentEditable. Real blocks. No fighting.**

Codex uses a revolutionary **coordinate-based block system** within a single ContentEditable. Each block knows its absolute position in the document, enabling block-level operations while preserving native browser editing behavior.

```
Traditional Editors:          Codex:
┌─────────────────┐           ┌─────────────────┐
│ ContentEditable │           │                 │
├─────────────────┤           │  Single         │
│ ContentEditable │    vs     │  ContentEditable│
├─────────────────┤           │  with smart     │
│ ContentEditable │           │  coordinates    │
└─────────────────┘           └─────────────────┘
   ↓                              ↓
Sync nightmares               Native behavior ✨
```

---

## 📦 Architecture Overview

Codex is split into two distinct layers:

### 1️⃣ **Codex Core** (The Framework)
The unopinionated engine that powers everything.

### 2️⃣ **Default Blocks** (The Implementation)  
Pre-built blocks to get you started.

---

## 🧬 Codex Core

> **Status**: 🟢 **90% Complete** - Production-ready architecture

The core framework provides the foundational architecture for building any block-based editor.

### Core Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Block System** | ✅ Ready | Extensible `Block` → `MegaBlock` hierarchy |
| **Single ContentEditable** | ✅ Ready | Managed through one element with event delegation |
| **Coordinate System** | ✅ Ready | Absolute positioning (`start`/`end`) for every block |
| **Transaction System** | ✅ Ready | Atomic operations with automatic rollback |
| **Strategy Pattern** | ✅ Ready | Pluggable behaviors via tagged strategies |
| **Selection Management** | ✅ Ready | `CodexSelection` wrapper around native Selection API |
| **Event Delegation** | ✅ Ready | Smart event bubbling with `ascend()` pattern |
| **Reactive State** | ✅ Ready | Svelte 5 runes (`$state`, `$derived`) throughout |
| **History System** | 🟡 Basic | Transaction history ready, undo/redo not implemented |
| **Plugin System** | 🔴 Planned | Not yet implemented |

### Core Classes

#### `Block` - The Foundation
```javascript
class Block {
  // Position in document
  start: number;  // Absolute start position
  end: number;    // Absolute end position
  
  // Hierarchy
  parent: MegaBlock;     // Parent block
  before: Block;         // Previous sibling
  after: Block;          // Next sibling
  
  // Selection
  selected: boolean;     // Is block in selection?
  
  // Extensibility
  capabilities: Set<Symbol>;  // What can this block do?
  strategies: Strategy[];     // How does it behave?
}
```

#### `MegaBlock` - Container Blocks
```javascript
class MegaBlock extends Block {
  children: Block[];         // Child blocks
  recursive: Block[];        // All descendants (flat)
  
  // Operations
  prepareInsert(data);      // Prepare insertion
  prepareRemove(data);      // Prepare removal
  prepareReplace(data);     // Prepare replacement
}
```

#### `Codex` - The Root
```javascript
class Codex extends MegaBlock {
  selection: CodexSelection;  // Selection state
  history: History;          // Transaction history
  systems: Map;              // Pluggable systems
  
  // Transaction API
  tx(operations): Transaction;
  effect(operations): any[];
}
```

### Transaction System

Every mutation is a transaction:

```javascript
// All operations are reversible
codex.tx([
  new TextEdition(block, { from: 0, to: 5, text: 'Hello' }),
  new BlocksInsertion(parent, { blocks: [...], offset: 2 })
])
.after(() => /* side effects */)
.execute()  // Automatic rollback on error
```

### Strategy Pattern

Complex behaviors without spaghetti code:

```javascript
new Strategy(
  'multi-block-delete',
  (codex, context) => {
    // Can this strategy handle the current context?
    return context.event.key === 'Backspace' && 
           codex.selection.isMultiBlock;
  },
  (codex, context) => {
    // Execute the strategy
    // ... complex multi-block deletion logic
  }
).tag('keydown').tag('delete').tag('multi-block');
```

### Event Flow

Events bubble up through the hierarchy until handled:

```
KeyboardEvent → Text.onkeydown → ascend() → Paragraph.strategies → ascend() → Codex.strategies
                  ↓                           ↓                                   ↓
              [not handled]              [check strategies]                 [check strategies]
```

---

## 📝 Default Blocks

> **Status**: 🟡 **40% Complete** - Basic editing works, advanced features in progress

Pre-built blocks that come with Codex. These demonstrate the framework's capabilities and provide a starting point.

### Currently Implemented

#### `Paragraph` Block
| Feature | Status | Notes |
|---------|--------|-------|
| Basic text input | ✅ Ready | Type and edit text |
| Single block navigation | ✅ Ready | Arrow keys, Home/End |
| Line breaks (Shift+Enter) | ✅ Ready | Creates `Linebreak` blocks |
| New paragraph (Enter) | ✅ Ready | Splits into new paragraph |
| Single block deletion | ✅ Ready | Backspace/Delete within block |
| Multi-block selection | 🟡 40% | Selection works, operations partial |
| Multi-block deletion | 🟡 40% | Basic cases work |
| Merge paragraphs | 🟡 50% | Backspace at start merges |
| Text normalization | ✅ Ready | Auto-merges adjacent text with same style |

#### `Text` Block  
| Feature | Status | Notes |
|---------|--------|-------|
| Text content | ✅ Ready | Stores and renders text |
| Style properties | ✅ Structure | `bold`, `italic`, `underline`, `strikethrough`, `code` |
| Style application | 🔴 Not implemented | No UI/shortcuts yet |
| Partial selection | ✅ Ready | Select within text |
| Smart splitting | ✅ Ready | Split at cursor for line breaks |

#### `Linebreak` Block
| Feature | Status | Notes |
|---------|--------|-------|
| Render `<br>` | ✅ Ready | Works |
| Selection behavior | ✅ Ready | Cursor positioning |
| Deletion | ✅ Ready | Removes on backspace/delete |

### What's Missing (Honestly)

#### Critical (P0)
- **Copy/Paste**: Not implemented at all
- **Multi-block operations**: Deletion across blocks is buggy
- **Selection edge cases**: Lots of them
- **Touch/Mobile**: Completely untested

#### Important (P1)  
- **Text formatting UI**: Styles exist but no way to apply them
- **Undo/Redo**: History exists but no ctrl+z/y
- **API**: No public methods like `getValue()`/`setValue()`
- **Persistence**: No serialization/deserialization

#### Nice to Have (P2)
- **Lists**: No ordered/unordered lists
- **Tables**: Not implemented
- **Images**: Not implemented  
- **Code blocks**: Not implemented
- **Quotes**: Not implemented

---

## 🚀 Getting Started

### Installation

```bash
npm install @aionbuilders/codex
```

### Basic Usage

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  
  const codex = new Codex({
    onInit: (codex) => {
      // Creates an empty paragraph by default
    }
  });
  
  // Get the Svelte component
  const Editor = codex.components.codex;
</script>

<div class="editor-container">
  <Editor {codex} />
</div>

<style>
  .editor-container {
    max-width: 800px;
    margin: 0 auto;
  }
</style>
```

### With Debug Panel

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  import Debug from '@aionbuilders/codex/debug';
  
  const codex = new Codex();
</script>

<div class="layout">
  <Editor {codex} />
  <Debug {codex} />  <!-- Shows block structure, selection, history -->
</div>
```

---

## 🎨 Creating Custom Blocks

### Simple Block Example

```javascript
import { Block } from '@aionbuilders/codex';

export class DividerBlock extends Block {
  static manifest = {
    type: 'divider',
    capabilities: []  // No editing capabilities
  };

  // No text content, just visual
  start = $derived(this.before?.end ?? 0);
  end = $derived(this.start);  // Zero-width block

  toJSON() {
    return { type: 'divider' };
  }
}
```

### Complex Block Example

```javascript
import { MegaBlock } from '@aionbuilders/codex';
import { EDITABLE, MERGEABLE } from '@aionbuilders/codex/capabilities';

export class QuoteBlock extends MegaBlock {
  static manifest = {
    type: 'quote',
    capabilities: [EDITABLE, MERGEABLE],
    blocks: {
      paragraph: Paragraph,  // Reuse existing blocks!
      text: Text
    },
    strategies: [
      // Custom strategies for quote behavior
    ]
  };

  constructor(codex, init = {}) {
    super(codex, init);
    this.author = init.author || '';
  }

  // Custom focus behavior
  focus(position) {
    // Focus first paragraph
    this.children[0]?.focus(position);
  }

  toJSON() {
    return {
      type: 'quote',
      author: this.author,
      children: this.children.map(c => c.toJSON())
    };
  }
}
```

### Registering Custom Blocks

```javascript
const codex = new Codex({
  components: {
    divider: DividerComponent,  // Your Svelte component
    quote: QuoteComponent
  },
  blocks: {
    divider: DividerBlock,
    quote: QuoteBlock
  }
});
```

---

## 🛠️ Utilities

### Selection Utils (`selection.svelte.js`)
```javascript
class CodexSelection extends SvelteSelection {
  startBlock;     // First selected block
  endBlock;       // Last selected block  
  isMultiBlock;   // Selection spans multiple blocks
  parent;         // Common parent of selection
}
```

### Operation Utils (`operations.utils.js`)
```javascript
// Smart parameters
block.prepareEdit(SMART);  // Use current selection

// Execute with data
executor(block, data => /* prepare ops */)(data);
```

### Coordinate Utils (`coordinates.utils.js`)
```javascript
findClosestParentIndex(chainId1, chainId2);  // Find common parent
```

### Focus Utils (`focus.values.js`)
```javascript
new Focus(start, end, scope);  // Create focus position
```

---

## 📊 Performance Characteristics

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| First input delay | <50ms | ✅ ~10ms | Native ContentEditable |
| Typing latency | <16ms | ✅ ~5ms | Direct DOM updates |
| 1000 blocks render | <100ms | ✅ ~80ms | Efficient diffing |
| 10k blocks render | <1s | 🟡 ~1.2s | Needs virtual scrolling |
| Memory (1000 blocks) | <50MB | ✅ ~30MB | Lightweight blocks |

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current) - v0.x
- [x] Core architecture
- [x] Basic editing
- [ ] Multi-block selection (40%)
- [ ] Copy/paste (0%)
- [ ] Undo/redo (0%)
- [ ] Public API (0%)

### Phase 2: Essentials - v1.0
- [ ] Text formatting UI
- [ ] Lists (ordered/unordered)
- [ ] Links
- [ ] Basic keyboard shortcuts
- [ ] Mobile support
- [ ] Serialization

### Phase 3: Advanced - v2.0
- [ ] Tables
- [ ] Code blocks with highlighting
- [ ] Images & media
- [ ] Drag & drop
- [ ] Plugin API
- [ ] Collaborative editing

### Phase 4: Ecosystem - v3.0
- [ ] Official plugins
- [ ] Themes
- [ ] Framework adapters (React, Vue)
- [ ] Cloud sync
- [ ] AI integrations

---

## 🤝 Contributing

We need help! The architecture is solid but there's lots to build.

### Where to Help

#### 🔥 High Priority
- **Multi-block selection/deletion** - Complex but critical
- **Copy/paste** - Needs clean HTML parsing
- **Mobile support** - Touch events, virtual keyboard

#### 🎯 Good First Issues
- **Text formatting UI** - Add buttons for bold/italic
- **Keyboard shortcuts** - Ctrl+B, Ctrl+I, etc.
- **More blocks** - Lists, quotes, code blocks

#### 🧪 Testing Needed
- Edge cases in selection
- Performance with large documents
- Browser compatibility

### Development

```bash
# Setup
git clone https://github.com/aionbuilders/codex.git
cd codex
npm install

# Development
npm run dev          # Start dev server
npm run check        # Type checking
npm run build        # Build library

# Project structure
src/lib/
├── states/          # Core state management (THE BRAIN)
│   ├── codex.svelte.js       # Root class
│   ├── block.svelte.js       # Base classes  
│   ├── selection.svelte.js   # Selection wrapper
│   ├── history.svelte.js     # Transaction history
│   ├── strategy.svelte.js    # Strategy pattern
│   └── blocks/               
│       ├── paragraph.svelte.js
│       ├── text.svelte.js
│       └── strategies/       # Block-specific strategies
├── components/      # Svelte components (THE FACE)
├── utils/          # Helpers
└── debug/          # Debug panel
```

### Code Philosophy

1. **No TypeScript** - JSDoc only
2. **Svelte 5 Runes** - Use `$state`, `$derived`
3. **Single Source of Truth** - State in classes, components are dumb
4. **Transactions Everything** - All mutations must be reversible
5. **Browser First** - Work with the browser, not against it

---

## 🙏 Acknowledgments

### Standing on the Shoulders of Giants

**Inspiration**
- [ProseMirror](https://prosemirror.net) - Transaction system
- [Lexical](https://lexical.dev) - Single ContentEditable approach  
- [Editor.js](https://editorjs.io) - Block philosophy
- [Slate](https://slatejs.org) - Plugin architecture

**Built With**
- [Svelte 5](https://svelte.dev) - The disappearing framework
- [SvelteKit](https://kit.svelte.dev) - Development environment
- [Vite](https://vitejs.dev) - Build tool

### Special Thanks
- The Svelte team for Svelte 5 runes
- Everyone who said "just use ProseMirror" (we didn't)
- The ContentEditable API (for better or worse)

---

## 📄 License

MIT © [Killian Di Vincenzo](https://killiandvcz.fr)

---

<div align="center">

### ⚠️ Alpha Software Warning ⚠️

**This is experimental software under heavy development.**  
APIs will break. Bugs exist. Dragons be here.

**But the architecture is solid and the vision is clear.**

Want to build the future of text editing? [Join us →](https://github.com/aionbuilders/codex/discussions)

</div>