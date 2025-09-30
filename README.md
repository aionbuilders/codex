# 🚀 Codex Editor

> **A modular block editor experiment with single ContentEditable.**  
> Built with Svelte 5 runes for fine-grained reactivity.

<div align="center">

[![npm version](https://img.shields.io/npm/v/@aionbuilders/codex.svg)](https://www.npmjs.com/package/@aionbuilders/codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Svelte 5](https://img.shields.io/badge/Svelte-5.0-ff3e00.svg)](https://svelte.dev)
[![Status: Early Alpha](https://img.shields.io/badge/Status-Early%20Alpha-red.svg)]()

**⚠️ Not production ready. Active development. Everything may change.**

</div>

---

## What is Codex?

An experimental approach to building a block-based rich text editor using:
- **Single ContentEditable** (preserves browser behavior)
- **Real block architecture** (not just visual)
- **Svelte 5 runes** for reactive state management

Currently, it's a working prototype that can handle basic text editing with paragraphs, line breaks, and selection.

---

## ✅ What Actually Works Today

### Core Features Implemented
- ✅ **Basic text editing** in paragraphs
- ✅ **Line breaks** with Shift+Enter
- ✅ **Single block selection** and navigation
- ✅ **Block hierarchy** (Codex → Paragraph → Text/Linebreak)
- ✅ **Transaction system** with automatic rollback
- ✅ **Strategy pattern** for keyboard handling
- ✅ **Reactive coordinates** (each block knows its position)
- ✅ **Debug panel** to visualize structure

### Partially Working
- 🟡 **Multi-block selection** (detection works, operations buggy)
- 🟡 **Block deletion** (single block OK, multi-block buggy)
- 🟡 **Focus management** (works but uses retry pattern = code smell)

### Structure Ready (Not Functional)
- 📦 **Text styling** (properties exist: bold, italic, etc. - no UI/shortcuts)
- 📦 **History system** (tracks transactions - no undo/redo)
- 📦 **Preset system** (MinimalPreset exists, not really configurable)

---

## ❌ What Doesn't Work Yet

### Not Implemented At All
- ❌ **Copy/Paste** 
- ❌ **Undo/Redo** (Ctrl+Z/Y)
- ❌ **Text formatting UI**
- ❌ **Public API** (getValue, setValue, etc.)
- ❌ **Touch/Mobile support**
- ❌ **Lists, Headings, Tables, Images, etc.**
- ❌ **Plugin system**
- ❌ **Serialization** (HTML, Markdown export)

---

## 🚀 Current Usage

### Installation
```bash
npm install @aionbuilders/codex
```

### Basic Setup (What works today)

```javascript
import { Codex } from '@aionbuilders/codex';
import { Paragraph } from '@aionbuilders/codex/blocks';

// Create editor with initial content
const codex = new Codex({
  in: Codex.data([
    Paragraph.data("First paragraph\nwith linebreak"),
    Paragraph.data("Second paragraph")
  ])
});

// Get the Svelte component
const Editor = codex.component;

// In your Svelte component:
// <Editor {codex} />
```

### With Debug Panel
```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  import Debug from '@aionbuilders/codex/debug/Debug.svelte';
  
  const codex = new Codex();
</script>

<div>
  <Editor {codex} />
  <Debug {codex} />
</div>
```

That's it. That's all you can do right now.

---

## 🏗️ Architecture (The Good Part)

The architecture is actually solid and the main reason this project has potential:

### Block Hierarchy
```
Codex (root)
└── Paragraph (container)
    ├── Text (leaf)
    ├── Linebreak (leaf)
    └── Text (leaf)
```

### Every Block Has:
```javascript
class Block {
  // Position tracking (reactive)
  start = $derived(/* calculated */);
  end = $derived(/* calculated */);
  
  // Selection state (reactive)
  selected = $derived(/* from selection API */);
  
  // Hierarchy
  parent    // Parent block
  before    // Previous sibling
  after     // Next sibling
  
  // Operations
  prepareEdit()    // Returns operations
  prepareInsert()  // Returns operations
  prepareRemove()  // Returns operations
}
```

### Transaction System
```javascript
// All mutations go through transactions
codex.tx([
  new TextEdition(block, { from: 0, to: 5, text: 'Hello' })
]).execute();  // Can rollback on error
```

### Strategy Pattern
```javascript
new Strategy(
  'multi-block-delete',
  (codex, context) => /* can handle? */,
  (codex, context) => /* handle it */
).tag('keydown', 'delete');
```

---

## 🔬 Technical Details

### What's Good
- **Clean separation** between state (`.svelte.js`) and UI (`.svelte`)
- **Reactive coordinates** update automatically with Svelte 5 runes
- **Event bubbling** through block hierarchy
- **Extensible** via manifests and capabilities

### What's Questionable
- **Focus retry pattern** (up to 10 `requestAnimationFrame` retries)
- **Many $derived** computations (performance unknown)
- **Complex prepare/execute/apply** pattern (maybe overengineered)
- **Normalizations in effects** (risk of infinite loops)

### Dependencies
- Svelte 5.34+
- SvelteKit (for development)
- No other runtime dependencies

---

## 🗺️ Realistic Roadmap

### Phase 1: Fix Core (Current)
- [ ] Fix multi-block selection deletion
- [ ] Stabilize focus without retries  
- [ ] Add copy/paste basic
- [ ] Add undo/redo

### Phase 2: Make Usable
- [ ] Text styling with UI
- [ ] Basic public API
- [ ] Performance testing
- [ ] Serialization

### Phase 3: Add Features
- [ ] More block types
- [ ] Plugin system
- [ ] Mobile support

---

## 🤝 Contributing

This is an experiment. If you're interested in the approach:

1. **Try it out** and report what breaks (spoiler: lots)
2. **Fix bugs** in multi-block selection (critical path)
3. **Add tests** (there are none)
4. **Discuss architecture** in issues

### Dev Setup
```bash
git clone https://github.com/aionbuilders/codex
cd codex
npm install
npm run dev  # Starts dev server
```

### Code Structure
```
src/lib/
├── states/          # Core logic (Svelte 5 runes)
│   ├── codex.svelte.js
│   ├── block.svelte.js
│   └── blocks/
│       ├── paragraph.svelte.js
│       └── text.svelte.js
├── components/      # Svelte components
├── strategies/      # Event handlers
└── utils/          # Helpers
```

---

## 💭 Philosophy & Vision

**The Vision** (not reality yet):
- One editor that scales from textarea to Notion
- Modular enough to use anywhere
- Respects browser native behavior

**Current Reality**:
- Interesting architecture
- Basic editing works
- Lots of bugs
- No production use cases

---

## ⚠️ Important Disclaimers

1. **This is NOT production ready**
2. **APIs will change completely**
3. **Many basic features don't work**
4. **No tests, no docs, no stability**
5. **Copy/paste doesn't work at all**

If you need a working editor today, use:
- [TipTap](https://tiptap.dev) (stable, popular)
- [Slate](https://slatejs.org) (mature, React)
- [Lexical](https://lexical.dev) (by Meta)
- [EditorJS](https://editorjs.io) (simple blocks)

---

## 📜 License

MIT © [Killian Di Vincenzo](https://killiandvcz.com)

---

<div align="center">

### This is an experiment in progress.

**Interested in the approach?** Star & watch the repo.  
**Want to help?** Pick an issue and dive in.  
**Need an editor today?** Use something else.

</div>