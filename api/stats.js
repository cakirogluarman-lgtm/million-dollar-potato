let cache = { t: 0, data: null };

export default async function handler(req, res) {
  try {
    if (cache.data && Date.now() - cache.t < 8000) {
      res.setHeader('Cache-Control', 's-maxage=5');
      return res.status(200).json(cache.data);
    }
    const auth = { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY };
    let total = 0, count = 0, recent = [], starting_after = null, pages = 0;
    while (pages < 30) {
      let url = 'https://api.stripe.com/v1/payment_intents?limit=100&expand[]=data.latest_charge';
      if (starting_after) url += '&starting_after=' + starting_after;
      const r = await fetch(url, { headers: auth });
      const j = await r.json();
      if (j.error) return res.status(400).json({ error: j.error.message });
      for (const pi of j.data) {
        const isPotato = pi.metadata && pi.metadata.potato === '1';
        if (pi.status === 'succeeded' && isPotato) {
          total += pi.amount_received || pi.amount;
          count += 1;
          if (recent.length < 12) {
            const ch = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
            const bd = ch && ch.billing_details ? ch.billing_details : {};
            let name = pi.metadata.potato_name;
            if (!name) name = (bd.name || 'someone').split(' ')[0];
            name = String(name).toLowerCase().slice(0, 24);
            const country = (bd.address && bd.address.country) ||
              (ch && ch.payment_method_details && ch.payment_method_details.card && ch.payment_method_details.card.country) || null;
            recent.push({ n: name, c: country, a: Math.round((pi.amount_received || pi.amount) / 100), t: pi.created });
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
