import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phone, fileUrl, filename } = req.body;

  if (!phone || !fileUrl) {
    return res.status(400).json({ success: false, message: 'Missing phone or fileUrl' });
  }

  try {
    // ---- Example: WhatsApp Cloud API ----
    const token = process.env.WHATSAPP_TOKEN; // put your token in .env.local
    const phoneId = process.env.WHATSAPP_PHONE_ID; // your WhatsApp Business phone ID

    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'document',
      document: {
        link: fileUrl,
        filename: filename || 'document.pdf',
      },
    };

    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('WhatsApp API error:', errText);
      return res.status(500).json({ success: false, message: 'WhatsApp API error' });
    }

    return res.status(200).json({ success: true, message: 'Document sent successfully' });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
