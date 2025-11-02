import type { NextApiRequest, NextApiResponse } from 'next';
import { stkPush } from '@/lib/mpesa/mpesa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, amount } = req.body;

  try {
    const result = await stkPush(phone, Number(amount));
    res.status(200).json(result);
  } catch (error: any) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
}
