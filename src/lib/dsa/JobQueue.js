// Module 5.9 — Background job queue, built on our linked-list Queue.
// Jobs wait in FIFO order; at most `concurrency` run at the same time.
// onIdle() returns a promise that resolves once every job has finished.
// Used for: appointment reminders (3B-6).

import { Queue } from "./Queue";

export class JobQueue {
  constructor(handler, concurrency = 1) {
    this.q = new Queue();
    this.handler = handler;
    this.concurrency = concurrency;
    this.running = 0;
    this.completed = 0;
    this.failed = 0;
    this.errors = [];
    this.idleResolvers = [];
  }

  add(job) {                             // O(1)
    this.q.enqueue(job);
    this._drain();
    return this;
  }

  addAll(jobs) {
    for (const job of jobs) this.q.enqueue(job);
    this._drain();
    return this;
  }

  _drain() {
    while (this.running < this.concurrency && !this.q.isEmpty()) {
      const job = this.q.dequeue();
      this.running++;
      Promise.resolve()
        .then(() => this.handler(job))
        .then(() => {
          this.completed++;
        })
        .catch((err) => {
          this.failed++;
          this.errors.push({ job, message: err?.message ?? String(err) });
        })
        .finally(() => {
          this.running--;
          this._drain();
          this._checkIdle();
        });
    }
  }

  _checkIdle() {
    if (this.running === 0 && this.q.isEmpty()) {
      const resolvers = this.idleResolvers;
      this.idleResolvers = [];
      resolvers.forEach((resolve) => resolve());
    }
  }

  onIdle() {
    if (this.running === 0 && this.q.isEmpty()) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  stats() {
    return {
      waiting: this.q.size(),
      running: this.running,
      completed: this.completed,
      failed: this.failed,
    };
  }
}
