const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Try fn up to `attempts` times. Waits baseDelay, 2×, 4×… between tries (exponential backoff),
// so a struggling SMS network gets breathing room instead of being hammered.
export async function withRetry(fn, { attempts = 3, baseDelayMs = 300, sleep = wait } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
