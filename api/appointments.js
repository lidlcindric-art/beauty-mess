import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;

  // GET — list appointments
  if (req.method === 'GET') {
    const { date, view } = req.query;
    if (view === 'slots' && date) {
      const taken = await redis.smembers(`slots:${date}`) || [];
      return res.json({ slots: taken });
    }
    if (isAdmin) {
      const keys = await redis.keys('appt:*');
      if (!keys.length) return res.json({ appointments: [] });
      const appts = await redis.mget(...keys);
      const list = appts
        .filter(Boolean)
        .map(a => typeof a === 'string' ? JSON.parse(a) : a)
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      return res.json({ appointments: list });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // POST — new appointment
  if (req.method === 'POST') {
    const { name, phone, email, service, date, time, note } = req.body;
    if (!name || !phone || !service || !date || !time) {
      return res.status(400).json({ error: 'Nedostaju obavezni podaci' });
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const datetime = `${date}T${time}`;
    const appt = { id, name, phone, email: email || '', service, date, time, datetime, note: note || '', createdAt: new Date().toISOString(), status: 'confirmed' };

    // check slot not taken
    const taken = await redis.sismember(`slots:${date}`, time);
    if (taken) return res.status(409).json({ error: 'Termin je već zauzet' });

    await redis.set(`appt:${id}`, JSON.stringify(appt));
    await redis.sadd(`slots:${date}`, time);
    await redis.expire(`slots:${date}`, 60 * 60 * 24 * 90); // 90 dana

    // Notify owner via email (Resend)
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Beauty Mess <noreply@beauty-mess.hr>',
            to: process.env.OWNER_EMAIL || 'anita@beauty-mess.hr',
            subject: `✨ Novi termin: ${name} — ${date} u ${time}`,
            html: `<h2>Novi termin rezerviran!</h2>
              <table><tr><td><b>Ime:</b></td><td>${name}</td></tr>
              <tr><td><b>Telefon:</b></td><td>${phone}</td></tr>
              <tr><td><b>Usluga:</b></td><td>${service}</td></tr>
              <tr><td><b>Datum:</b></td><td>${date}</td></tr>
              <tr><td><b>Vrijeme:</b></td><td>${time}</td></tr>
              ${note ? `<tr><td><b>Napomena:</b></td><td>${note}</td></tr>` : ''}
              </table>
              <p><a href="${process.env.SITE_URL || ''}/admin">Otvori admin panel</a></p>`
          })
        });
      } catch(e) { console.error('Email error:', e.message); }
    }

    return res.status(201).json({ success: true, appointment: appt });
  }

  // DELETE — cancel appointment (admin only)
  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });
    const appt = await redis.get(`appt:${id}`);
    if (!appt) return res.status(404).json({ error: 'Termin nije pronađen' });
    const a = typeof appt === 'string' ? JSON.parse(appt) : appt;
    await redis.del(`appt:${id}`);
    await redis.srem(`slots:${a.date}`, a.time);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
