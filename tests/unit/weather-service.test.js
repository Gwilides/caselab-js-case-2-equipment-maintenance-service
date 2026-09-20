import { jest, describe, it, expect } from '@jest/globals';
import { WeatherService } from '../../src/services/WeatherService.js';
import { NotFoundError, BadGatewayError } from '../../src/errors/index.js';

describe('WeatherService Outdoor Suitability Evaluation', () => {
  const mockEquipment = {
    id: 'eq-100',
    name: 'Ветропарк Северный №5',
    location: { lat: 60.123, lon: 30.456 }
  };

  const mockRepo = {
    findById: jest.fn().mockImplementation(async (id) => {
      if (id === 'eq-100') return mockEquipment;
      return null;
    })
  };

  const rules = {
    maxWindSpeed: 12.0,
    maxPrecipitation: 1.0,
    minTemp: -15.0,
    maxTemp: 35.0
  };

  it('should throw NotFoundError if equipment does not exist', async () => {
    const service = new WeatherService(mockRepo, {}, rules);
    await expect(service.getEquipmentWeather('unknown-id')).rejects.toThrow(NotFoundError);
  });

  it('should throw BadGatewayError if external meteo client fails', async () => {
    const mockMeteoClient = {
      getForecast: jest.fn().mockRejectedValue(new Error('Network connection timeout'))
    };

    const service = new WeatherService(mockRepo, mockMeteoClient, rules);
    await expect(service.getEquipmentWeather('eq-100')).rejects.toThrow(BadGatewayError);
  });

  it('should mark outdoor window as suitable when weather parameters are within limits', async () => {
    const mockMeteoClient = {
      getForecast: jest.fn().mockResolvedValue([
        {
          date: '2026-09-21',
          minTemp: 10,
          maxTemp: 20,
          precipitation: 0.0,
          maxWindSpeed: 8.5
        },
        {
          date: '2026-09-22',
          minTemp: 12,
          maxTemp: 22,
          precipitation: 0.2,
          maxWindSpeed: 10.0
        }
      ])
    };

    const service = new WeatherService(mockRepo, mockMeteoClient, rules);
    const result = await service.getEquipmentWeather('eq-100');

    expect(result.equipmentId).toBe('eq-100');
    expect(result.assessment.suitable).toBe(true);
    expect(result.assessment.reasons.length).toBe(0);
    expect(result.forecast.every((f) => f.suitable)).toBe(true);
  });

  it('should mark outdoor window as unsuitable when wind speed or precipitation exceeds threshold', async () => {
    const mockMeteoClient = {
      getForecast: jest.fn().mockResolvedValue([
        {
          date: '2026-09-21',
          minTemp: 8,
          maxTemp: 15,
          precipitation: 5.4,
          maxWindSpeed: 18.2
        }
      ])
    };

    const service = new WeatherService(mockRepo, mockMeteoClient, rules);
    const result = await service.getEquipmentWeather('eq-100');

    expect(result.assessment.suitable).toBe(false);
    expect(result.assessment.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.assessment.reasons.some((r) => r.includes('ветра'))).toBe(true);
    expect(result.assessment.reasons.some((r) => r.includes('Осадки'))).toBe(true);
  });
});
