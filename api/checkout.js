export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const raw = (req.body && req.body.qty) || 1;
    const qty = Math.max(1, Math.min(100000, parseInt(raw, 10) || 1));
    const origin = req.headers.origin || 'https://million-dollar-potato.vercel.app';
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', origin + '/?paid=1');
    params.append('cancel_url', origin + '/');
    params.append('submit_type', 'pay');
    params.append('payment_intent_data[metadata][potato]', '1');
    params.append('line_items[0][quantity]', String(qty));
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', '100');
    params.append('line_items[0][price_data][product_data][name]', 'The Million Dollar Potato - novelty certificate');
    params.append('line_items[0][price_data][product_data][description]', 'A numbered novelty digital certificate. Not a security. It is a potato.');
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const session = await r.json();
    if (session.error) {
      return res.status(400).json({ error: session.error.message });
    }
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
