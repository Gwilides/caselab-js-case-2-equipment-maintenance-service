import { analyticsService } from '../services/AnalyticsService.js';

export class SiteController {
  constructor(service = analyticsService) {
    this.service = service;
  }

  getSummary = async (req, res) => {
    const summary = await this.service.getSiteSummary(req.params.id);
    res.status(200).json({ data: summary });
  };
}

export const siteController = new SiteController();
export default siteController;
