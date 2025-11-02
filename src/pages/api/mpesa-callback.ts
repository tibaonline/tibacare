import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('M-Pesa Callback:', req.body);
  res.status(200).json({ message: 'Callback received' });
}
