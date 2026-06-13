export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const raw = (req.body && req.body.qty) || 1;
    const qty = Math.max(1, Math.min(100000, parseInt(raw, 10) || 1));

    const params = new URLSearchParams();
    params.append('amount', String(qty * 100));
    params.append('currency', 'usd');
    params.append('payment_method_types[]', 'card');
    params.append('payment_method_types[]', 'link');
    params.append('metadata[potato]', '1');
    params.append('description', 'The Million Dollar Potato - novelty certificate x' + qty);

    const r = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const pi = await r.json();
    if (pi.error) {
      return res.status(400).json({ error: pi.error.message });
    }
    return res.status(200).json({ clientSecret: pi.client_secret });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
