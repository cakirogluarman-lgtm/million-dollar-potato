export default async function handler(req, res) {
  return res.status(404).json({ error: 'nothing to see here. it is a potato.' });
}
