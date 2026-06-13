let cache = { t: 0, data: null };
export default async function handler(req, res) {
  try {
    if (cache.data && Date.now() - cache.t < 8000) {
      res.setHeader('Cache-Control', 's-maxage=5');
      return res.status(200).json(cache.data);
    }
    const key = process.env.STRIPE_SECRET_KEY;
    const auth = { 'Authorization': 'Bearer ' + key };
    let total = 0, count = 0, recent = [], starting_after = null, pages = 0;
    while (pages < 30) {
      let url = 'https://api.stripe.com/v1/charges?limit=100';
      if (starting_after) url += '&starting_after=' + starting_after;
      const r = await fetch(url, { headers: auth });
      const j = await r.json();
      if (j.error) return res.status(400).json({ error: j.error.message });
      for (const c of j.data) {
        if (c.paid && !c.refunded && c.status === 'succeeded' && c.metadata && c.metadata.potato === '1') {
          total += c.amount;
          count += 1;
          if (recent.length < 12) {
            const bd = c.billing_details || {};
            const name = (bd.name || 'someone').split(' ')[0].toLowerCase();
            const country = (bd.address && bd.address.country) || (c.payment_method_details && c.payment_method_details.card && c.payment_method_details.card.country) || null;
            recent.push({ n: name, c: country, a: Math.round(c.amount / 100), t: c.created });
          }
        }
      }
      if (!j.has_more) break;
      starting_after = j.data[j.data.length - 1].id;
      pages += 1;
    }
    const data = { total: Math.round(total / 100), count: count, recent: recent };
    cache = { t: Date.now(), data: data };
    res.setHeader('Cache-Control', 's-maxage=5');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
