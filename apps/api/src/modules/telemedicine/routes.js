import { Router } from 'express';

export const telemedicineRouter = Router();

telemedicineRouter.get('/appointments', (_req, res) => {
  res.json({ module: 'telemedicine', message: 'Appointment endpoint ready.' });
});
