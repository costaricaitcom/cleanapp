// Retry a promise-returning function up to maxAttempts times, each with a timeout
export async function withRetry<T>(fn: () => Promise<T>, timeoutMs = 10000, maxAttempts = 3): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // Optionally, add a small delay between retries
        await new Promise(res => setTimeout(res, 400));
      }
    }
  }
  throw lastError || new Error('Error desconocido');
}

// Helper: timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
} 