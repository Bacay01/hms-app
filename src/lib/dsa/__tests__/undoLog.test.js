import { replayUndoLog } from "@/lib/undoLog";

const move = (id, from, to) => ({ id, action: "encounter.status", details: { from, to } });
const undo = (id, undoOf) => ({ id, action: "encounter.status_undo", details: { undoOf } });

describe("replayUndoLog (Stack)", () => {
  it("the most recent move is on top", () => {
    const s = replayUndoLog([move("a", "WAITING", "WITH_NURSE"), move("b", "WITH_NURSE", "WITH_DOCTOR")]);
    expect(s.peek().id).toBe("b");
  });

  it("an undo pops the move it reversed, exposing the one before", () => {
    const s = replayUndoLog([
      move("a", "WAITING", "WITH_NURSE"),
      move("b", "WITH_NURSE", "WITH_DOCTOR"),
      undo("u1", "b"),
    ]);
    expect(s.peek().id).toBe("a");
    expect(s.size()).toBe(1);
  });

  it("two undos in a row walk back two moves (LIFO)", () => {
    const s = replayUndoLog([
      move("a", "WAITING", "WITH_NURSE"),
      move("b", "WITH_NURSE", "WITH_DOCTOR"),
      undo("u1", "b"),
      undo("u2", "a"),
    ]);
    expect(s.isEmpty()).toBe(true);
  });

  it("ignores an undo that doesn't match the top", () => {
    const s = replayUndoLog([move("a", "WAITING", "WITH_NURSE"), undo("u1", "zzz")]);
    expect(s.peek().id).toBe("a");
  });
});
