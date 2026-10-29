import { Stack } from "../Stack";

describe("Stack (LIFO)", () => {
  it("pops the last item pushed", () => {
    const s = new Stack();
    s.push(10).push(20).push(30);
    expect(s.peek()).toBe(30);
    expect(s.pop()).toBe(30);
    expect(s.toArray()).toEqual([10, 20]);
  });

  it("returns null when empty", () => {
    const s = new Stack();
    expect(s.pop()).toBeNull();
    expect(s.peek()).toBeNull();
    expect(s.isEmpty()).toBe(true);
  });

  it("supports undo/redo with two stacks (Module 3.5)", () => {
    const undo = new Stack();
    const redo = new Stack();
    let status = "WAITING";

    const move = (to) => { undo.push(status); redo.clear(); status = to; };
    const doUndo = () => { if (!undo.isEmpty()) { redo.push(status); status = undo.pop(); } };
    const doRedo = () => { if (!redo.isEmpty()) { undo.push(status); status = redo.pop(); } };

    move("WITH_NURSE");
    move("WITH_DOCTOR");
    doUndo();
    expect(status).toBe("WITH_NURSE");
    doRedo();
    expect(status).toBe("WITH_DOCTOR");
  });
});
