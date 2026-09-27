import { analyticsService } from '../services/AnalyticsService.js';

export class ReportController {
  constructor(service = analyticsService) {
    this.service = service;
  }

  getEquipmentLoad = async (req, res) => {
    const report = await this.service.getEquipmentLoadReport(req.query);
    res.status(200).json({
      data: report.items,
      pagination: report.pagination
    });
  };
}

export const reportController = new ReportController();
export default reportController;
