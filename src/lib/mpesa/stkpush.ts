// src/lib/mpesa/stkpush.ts
import axios from 'axios';
import { getAccessToken } from './mpesa';

export async function initiateSTKPush(phone: string, amount: number) {
  const token = await getAccessToken();
  const shortCode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

  const response = await axios.post(
    'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: `${process.env.BASE_URL}/api/mpesa-callbacks`,
      AccountReference: 'TibaCare',
      TransactionDesc: 'Consultation Payment',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}
