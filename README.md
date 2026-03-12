# ProactiveUI Demo

Local VS Code/Cursor extension demo for proactive plan-aware assistance in Python files.

## Current Demo Flow

1. Open `examples/demo_plan.py`
2. Run the extension in debug mode with the `Run ProactiveUI Extension` launch config
3. In the Extension Development Host, run `ProactiveUI: Set Anthropic API Key` once from Command Palette
4. Edit either Python (`.py`) plan comments or LaTeX (`.tex`) writing lines, or select a block
5. The action hover panel auto-expands with file-specific actions
   - Python examples: `Write Code`, `Detail Step`, `Explore Alternative`, `Revise`
   - LaTeX examples: `Fix Grammar`, `Reflect Understanding`
6. Click an action from the hover panel
7. Watch multiple agents appear in the `ProactiveUI` panel with thinking + summary updates
8. Artifact actions auto-insert draft output below the target comment
9. Approve or Undo artifacts from either the agent card or in-editor CodeLens controls

## Current Scope

- Python and LaTeX files
- Claude-based intent analysis (with automatic fallback to mock rules)
- Multiple concurrent sidebar agents
- Artifact apply flow back into the same document

## Next Step

Improve prompt quality and add LaTeX support using the same interaction model.
