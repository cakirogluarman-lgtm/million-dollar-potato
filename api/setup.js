export default async function handler(req, res) {
  const auth = { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY };
  try {
    if (req.method === 'GET') {
      const r = await fetch('https://api.stripe.com/v1/payment_method_domains?limit=20', { headers: auth });
      const j = await r.json();
      if (j.error) return res.status(400).json({ error: j.error.message });
      const out = (j.data || []).map(d => ({
        domain: d.domain_name,
        enabled: d.enabled,
        apple_pay: d.apple_pay && d.apple_pay.status,
        apple_pay_error: d.apple_pay && d.apple_pay.status_details && d.apple_pay.status_details.error_message
      }));
      return res.status(200).json({ domains: out });
    }
    if (req.method === 'POST') {
      // register the domain this request is being served from (e.g. themillionpotato.com),
      // or an explicit ?domain=... override
      const domain = (req.query && req.query.domain) || req.headers.host || 'million-dollar-potato.vercel.app';
      const p = new URLSearchParams();
      p.append('domain_name', domain);
      const r = await fetch('https://api.stripe.com/v1/payment_method_domains', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, auth),
        body: p.toString()
      });
      const j = await r.json();
      if (j.error) return res.status(400).json({ error: j.error.message });
      return res.status(200).json({
        domain: j.domain_name,
        apple_pay: j.apple_pay && j.apple_pay.status,
        apple_pay_error: j.apple_pay && j.apple_pay.status_details && j.apple_pay.status_details.error_message
      });
    }
    return res.status(405).json({ error: 'GET or POST' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
