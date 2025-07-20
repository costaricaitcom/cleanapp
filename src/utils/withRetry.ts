// Retry a promise-returning function up to maxAttempts times, each with a timeout
export async function withRetry<T>(fn: () => Promise<T>, timeoutMs = 10000, maxAttempts = 3): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt} failed:`, err.message);
      
      if (attempt < maxAttempts) {
        // Exponential backoff: wait longer between retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  
  // Provide more specific error messages
  if (lastError?.message?.includes('Tiempo de espera agotado')) {
    throw new Error(`Operación cancelada después de ${maxAttempts} intentos. Verifique su conexión a internet.`);
  }
  
  throw lastError || new Error('Error desconocido después de múltiples intentos');
}

// Helper: timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Tiempo de espera agotado'));
    }, ms);
    
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