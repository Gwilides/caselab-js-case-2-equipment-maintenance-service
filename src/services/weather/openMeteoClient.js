import env from '../../config/env.js';
import { fetchJson } from './httpClient.js';

/**
 * Получает прогноз погоды по координатам через Open-Meteo Forecast API.
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {number} [params.days=3]
 * @returns {Promise<Array<{ date: string, minTemp: number, maxTemp: number, precipitation: number, maxWindSpeed: number }>>}
 */
export async function getForecast({ latitude, longitude, days = 3 } = {}) {
  const data = await fetchJson(env.weatherApiBaseUrl, {
    queryParams: {
      latitude,
      longitude,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
      forecast_days: days,
      timezone: 'auto'
    }
  });

  if (!data?.daily || !Array.isArray(data.daily.time)) {
    throw new Error('Отсутствуют данные прогноза (daily) в ответе Open-Meteo API');
  }

  const {
    time = [],
    temperature_2m_min = [],
    temperature_2m_max = [],
    precipitation_sum = [],
    wind_speed_10m_max = []
  } = data.daily;

  return time.map((date, index) => ({
    date,
    minTemp: temperature_2m_min[index] ?? 0,
    maxTemp: temperature_2m_max[index] ?? 0,
    precipitation: precipitation_sum[index] ?? 0,
    maxWindSpeed: wind_speed_10m_max[index] ?? 0
  }));
}

export const openMeteoClient = {
  getForecast
};

export default openMeteoClient;
