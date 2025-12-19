// Error taxonomy for TaskList component
// - DataError: Malformed/missing task fields → Show fallback UI, log error
// - NetworkError: MCP fetch fails → Show error state, allow retry
// - AccessibilityError: UI not navigable/readable → Fail test, block deploy
// - PerformanceError: List render slow for >100 tasks → Warn, optimize
//
// Handling:
// DataError: Render fallback, log to console
// NetworkError: Show error UI, allow retry
// AccessibilityError: Block deploy, fail tests
// PerformanceError: Warn in dev, optimize if needed
