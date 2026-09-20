import { weatherService } from '../services/index.js';

export class WeatherController {
  constructor(service = weatherService) {
    this.service = service;
  }

  getEquipmentWeather = async (req, res) => {
    const data = await this.service.getEquipmentWeather(req.valid.params.id);
    res.status(200).json({ data });
  };
}

export const weatherController = new WeatherController();
export default weatherController;
