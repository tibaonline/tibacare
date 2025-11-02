"use client";

import { useState } from "react";
import axios from "axios";

export default function PaymentPage() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(100);

  const handlePayment = async () => {
    try {
      const { data } = await axios.post("/api/initiate-payment", { phone, amount });
      alert(`Payment initiated: ${JSON.stringify(data)}`);
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">Pay with M-Pesa</h1>
      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border p-2 mb-2"
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="border p-2 mb-2"
      />
      <button
        onClick={handlePayment}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Pay Now
      </button>
    </div>
  );
}
