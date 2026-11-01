import { DoublyLinkedList } from "../DoublyLinkedList";
import { buildVisitTimeline } from "@/lib/visitTimeline";

describe("DoublyLinkedList", () => {
  it("walks forwards and backwards", () => {
    const list = new DoublyLinkedList();
    list.push("b");
    list.push("c");
    list.unshift("a");
    expect(list.toArray()).toEqual(["a", "b", "c"]);
    expect([...list.reversed()]).toEqual(["c", "b", "a"]);
    expect(list.length).toBe(3);
  });

  it("removes a middle node in O(1) and relinks its neighbours", () => {
    const list = new DoublyLinkedList();
    list.push("a");
    const b = list.push("b");
    list.push("c");
    expect(list.remove(b)).toBe("b");
    expect(list.toArray()).toEqual(["a", "c"]);
    expect(list.head.next).toBe(list.tail);
    expect(list.tail.prev).toBe(list.head);
  });

  it("updates head and tail when removing the ends", () => {
    const list = new DoublyLinkedList();
    const a = list.push("a");
    const b = list.push("b");
    list.remove(a);
    expect(list.head.value).toBe("b");
    list.remove(b);
    expect(list.head).toBeNull();
    expect(list.tail).toBeNull();
    expect(list.length).toBe(0);
  });
});

describe("buildVisitTimeline", () => {
  const visits = [
    { id: "v3", startedAt: "2026-11-01T10:00:00Z" },
    { id: "v1", startedAt: "2026-10-12T09:00:00Z" },
    { id: "v2", startedAt: "2026-10-29T11:00:00Z" },
  ];

  it("links visits in date order", () => {
    const { list } = buildVisitTimeline(visits);
    expect(list.toArray().map((v) => v.id)).toEqual(["v1", "v2", "v3"]);
  });

  it("finds a visit's previous and next in O(1)", () => {
    const { nodeById } = buildVisitTimeline(visits);
    const middle = nodeById.get("v2");
    expect(middle.prev.value.id).toBe("v1");
    expect(middle.next.value.id).toBe("v3");
    expect(nodeById.get("v1").prev).toBeNull();
  });
});
