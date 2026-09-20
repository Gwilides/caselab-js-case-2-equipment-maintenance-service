import env from '../config/env.js';
import { NotFoundError, BadGatewayError } from '../errors/index.js';
import { openMeteoClient } from './weather/openMeteoClient.js';

export class WeatherService {
  /**
   * @param {import('../repositories/interfaces/EquipmentRepository.js').EquipmentRepository} equipmentRepository
   * @param {typeof openMeteoClient} [meteoClient]
   * @param {typeof env.outdoorRules} [rules]
   */
  constructor(equipmentRepository, meteoClient = openMeteoClient, rules = env.outdoorRules) {
    this.equipmentRepository = equipmentRepository;
    this.meteoClient = meteoClient;
    this.rules = rules;
  }

  evaluateDaySuitability(day) {
    const reasons = [];

    if (day.precipitation > this.rules.maxPrecipitation) {
      reasons.push(
        `Осадки (${day.precipitation} мм) превышают допустимый порог (${this.rules.maxPrecipitation} мм)`
      );
    }

    if (day.maxWindSpeed > this.rules.maxWindSpeed) {
      reasons.push(
        `Скорость ветра (${day.maxWindSpeed} км/ч) превышает допустимый порог (${this.rules.maxWindSpeed} км/ч)`
      );
    }

    if (day.minTemp < this.rules.minTemp) {
      reasons.push(
        `Минимальная температура (${day.minTemp}°C) ниже безопасного порога (${this.rules.minTemp}°C)`
      );
    }

    if (day.maxTemp > this.rules.maxTemp) {
      reasons.push(
        `Максимальная температура (${day.maxTemp}°C) выше безопасного порога (${this.rules.maxTemp}°C)`
      );
    }

    return {
      suitable: reasons.length === 0,
      reasons
    };
  }

  async getEquipmentWeather(equipmentId, days = 3) {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Оборудование с id "${equipmentId}"`);
    }

    const { lat, lon } = equipment.location;

    let dailyForecast;
    try {
      dailyForecast = await this.meteoClient.getForecast({
        latitude: lat,
        longitude: lon,
        days
      });
    } catch (err) {
      throw new BadGatewayError('Внешний погодный сервис временно недоступен', { cause: err });
    }

    const evaluatedDays = dailyForecast.map((day) => {
      const evaluation = this.evaluateDaySuitability(day);
      return {
        ...day,
        suitable: evaluation.suitable,
        reasons: evaluation.reasons
      };
    });

    const hasUnsuitableDay = evaluatedDays.some((d) => !d.suitable);
    const overallSuitable = !hasUnsuitableDay;

    const allReasons = evaluatedDays.flatMap((d) =>
      d.reasons.map((r) => `${d.date}: ${r}`)
    );

    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      location: equipment.location,
      assessment: {
        suitable: overallSuitable,
        summary: overallSuitable
          ? 'Погодные условия благоприятны для проведения наружных высотных и электромонтажных работ'
          : 'Погодные условия неблагоприятны для проведения наружных работ',
        reasons: allReasons,
        thresholds: {
          maxWindSpeed: this.rules.maxWindSpeed,
          maxPrecipitation: this.rules.maxPrecipitation,
          minTemp: this.rules.minTemp,
          maxTemp: this.rules.maxTemp
        }
      },
      forecast: evaluatedDays
    };
  }
}

export default WeatherService;
