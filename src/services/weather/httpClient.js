import env from '../../config/env.js';

export class WeatherHttpError extends Error {
  constructor(message, { status, statusText, url, body } = {}) {
    super(message);
    this.name = 'WeatherHttpError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.body = body;
  }
}

export class WeatherTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Превышено время ожидания ответа от внешнего сервиса (${timeoutMs} мс)`);
    this.name = 'WeatherTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class WeatherNetworkError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'WeatherNetworkError';
  }
}

/**
 * Выполняет HTTP-запрос к внешнему API с контролем таймаута через AbortController.
 *
 * @param {string | URL} baseUrl
 * @param {object} [options]
 * @param {Record<string, unknown>} [options.queryParams={}]
 * @param {number} [options.timeoutMs=env.requestTimeoutMs]
 * @param {Record<string, string>} [options.headers={}]
 * @returns {Promise<any>}
 */
export async function fetchJson(
  baseUrl,
  { queryParams = {}, timeoutMs = env.requestTimeoutMs, headers = {} } = {}
) {
  const url = new URL(baseUrl);
  const searchParams = new URLSearchParams(url.searchParams);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  url.search = searchParams.toString();

  const requestHeaders = {
    Accept: 'application/json',
    ...headers
  };

  const controller = new AbortController();
  let timerId;

  try {
    timerId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let response;
    try {
      response = await fetch(url.href, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal
      });
    } catch (error) {
      if (
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        controller.signal.aborted
      ) {
        throw new WeatherTimeoutError(timeoutMs);
      }

      throw new WeatherNetworkError(
        'Сетевая ошибка при обращении к внешнему погодному сервису',
        error
      );
    }

    if (!response.ok) {
      let body;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      throw new WeatherHttpError(
        `Внешний API вернул статус ошибки: ${response.status} ${response.statusText}`,
        {
          status: response.status,
          statusText: response.statusText,
          url: url.href,
          body
        }
      );
    }

    try {
      return await response.json();
    } catch (jsonErr) {
      throw new WeatherNetworkError('Некорректный JSON в ответе погодного сервиса', jsonErr);
    }
  } finally {
    clearTimeout(timerId);
  }
}

export default fetchJson;
