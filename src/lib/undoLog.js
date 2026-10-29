import { Stack } from "@/lib/dsa/Stack";

// Replays a user's queue actions (oldest → newest) through a Stack:
//   "encounter.status"      → push (a move that could be undone)
//   "encounter.status_undo" → pop  (undo always reverses whatever is on top)
// The item left on top is the next action that can be undone.
export function replayUndoLog(entries) {
  const stack = new Stack();
  for (const e of entries) {
    if (e.action === "encounter.status") {
      stack.push(e);
    } else if (e.action === "encounter.status_undo" && stack.peek()?.id === e.details?.undoOf) {
      stack.pop();
    }
  }
  return stack;
}
