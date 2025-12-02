import { Logger } from '@nestjs/common';
import { sleep } from './time.util';

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  logger?: Logger;
};

const defaultLogger = new Logger('RetryUtil');

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> => {
  const { retries = 3, delayMs = 2000, logger = defaultLogger } = options || {};
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) throw `Request failed after retries: ${error}`;

      logger.warn(
        `Retrying (${attempt + 1}/${retries}). Error:${
          error?.message || JSON.stringify(error)
        }`,
        fn.name,
      );
      await sleep(delayMs);
      attempt++;
    }
  }
};
