import { requestService } from '../services/index.js';

export class RequestController {
  constructor(service = requestService) {
    this.service = service;
  }

  create = async (req, res) => {
    const created = await this.service.create(req.valid.body);
    res.location(`/api/requests/${created.id}`);
    res.status(201).json({ data: created });
  };

  getAll = async (req, res) => {
    const result = await this.service.getAll(req.valid.query);
    res.status(200).json({
      data: result.items,
      pagination: result.pagination
    });
  };

  getById = async (req, res) => {
    const item = await this.service.getById(req.valid.params.id);
    res.status(200).json({ data: item });
  };

  update = async (req, res) => {
    const updated = await this.service.update(req.valid.params.id, req.valid.body);
    res.status(200).json({ data: updated });
  };

  updateStatus = async (req, res) => {
    const updated = await this.service.updateStatus(req.valid.params.id, req.valid.body.status);
    res.status(200).json({ data: updated });
  };

  delete = async (req, res) => {
    await this.service.delete(req.valid.params.id);
    res.status(204).send();
  };

  getByEquipmentId = async (req, res) => {
    const result = await this.service.getByEquipmentId(req.valid.params.id, req.valid.query);
    res.status(200).json({
      data: result.items,
      pagination: result.pagination
    });
  };

  bulkCreate = async (req, res) => {
    const result = await this.service.bulkCreate(req.valid.body.requests);
    res.status(207).json({ data: result });
  };
}

export const requestController = new RequestController();
export default requestController;
