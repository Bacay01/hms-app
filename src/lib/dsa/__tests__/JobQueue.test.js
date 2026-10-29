import { JobQueue } from "../JobQueue";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe("JobQueue", () => {
  it("runs every job in FIFO order", async () => {
    const done = [];
    const jq = new JobQueue(async (job) => { done.push(job); }, 1);
    jq.addAll(["a", "b", "c"]);
    await jq.onIdle();
    expect(done).toEqual(["a", "b", "c"]);
  });

  it("never runs more than `concurrency` jobs at once", async () => {
    let running = 0;
    let maxSeen = 0;
    const jq = new JobQueue(async () => {
      running++;
      maxSeen = Math.max(maxSeen, running);
      await wait(10);
      running--;
    }, 2);
    jq.addAll([1, 2, 3, 4, 5]);
    await jq.onIdle();
    expect(maxSeen).toBe(2);
    expect(jq.stats().completed).toBe(5);
  });

  it("records failures without stopping the queue", async () => {
    const jq = new JobQueue(async (n) => { if (n === 2) throw new Error("SMS failed"); }, 1);
    jq.addAll([1, 2, 3]);
    await jq.onIdle();
    expect(jq.stats()).toMatchObject({ completed: 2, failed: 1 });
    expect(jq.errors[0].message).toBe("SMS failed");
  });
});
