// src/pages/api/mpesa-callbacks.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('M-Pesa Callback Received:', req.body);
  res.status(200).json({ message: 'Callback received successfully' });
}
