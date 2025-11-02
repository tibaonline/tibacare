import { useState } from 'react';

export default function PayPage() {
  const [phone, setPhone] = useState('2547XXXXXXXX'); // change to 2547... format
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handlePay = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount, accountReference: 'TibaCare' })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
      <h1>Test M-Pesa STK Push (Sandbox)</h1>
      <p>Make sure .env.local has sandbox credentials and MPESA_CALLBACK_URL points to a public HTTPS URL (eg ngrok).</p>
      <div style={{ marginBottom: 8 }}>
        <label>Phone (format 2547XXXXXXXX):</label><br />
        <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width:'100%', padding:8 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Amount (KES):</label><br />
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width:'100%', padding:8 }} />
      </div>
      <button onClick={handlePay} disabled={loading} style={{ padding: '10px 18px' }}>
        {loading ? 'Sending...' : 'Send STK Push'}
      </button>

      <pre style={{ marginTop: 20, background: '#f7f7f7', padding: 12 }}>
        {result ? JSON.stringify(result, null, 2) : 'No result yet'}
      </pre>

      <p>After the user accepts the STK push, check your callback receiver (payments.json file or your configured DB) for the confirmation.</p>
    </div>
  );
}
