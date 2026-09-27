import { partService } from '../services/index.js';

export class PartController {
  constructor(service = partService) {
    this.service = service;
  }

  getAll = async (req, res) => {
    const result = await this.service.getAllParts(req.valid.query);
    res.status(200).json({
      data: result.items,
      pagination: {
        total: result.total,
        limit: req.valid.query.limit,
        offset: req.valid.query.offset
      }
    });
  };

  getById = async (req, res) => {
    const item = await this.service.getPartById(req.valid.params.id);
    res.status(200).json({ data: item });
  };

  create = async (req, res) => {
    const created = await this.service.createPart(req.valid.body);
    res.location(`/api/parts/${created.id}`);
    res.status(201).json({ data: created });
  };
}

export const partController = new PartController();
export default partController;
