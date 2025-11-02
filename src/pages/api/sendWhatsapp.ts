import type { NextApiRequest, NextApiResponse } from 'next';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages';
const TOKEN = 'YOUR_WHATSAPP_BUSINESS_API_TOKEN'; // Use permanent token

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { phoneNumber, pdfName, fileURL, textMessage } = req.body;

  if (!phoneNumber || !fileURL || !textMessage) return res.status(400).json({ success: false, message: 'Missing parameters' });

  try {
    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'document',
      document: {
        link: fileURL,
        filename: pdfName
      },
      text: { body: textMessage }
    };

    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (response.ok) res.status(200).json({ success: true, data });
    else res.status(500).json({ success: false, message: JSON.stringify(data) });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}
