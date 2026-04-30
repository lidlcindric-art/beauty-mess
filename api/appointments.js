import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { date, view } = req.query;

    // Klijent: slobodni termini za odabrani datum
    if (view === 'slots' && date) {
      const taken = await redis.smembers(`slots:${date}`) || [];
      return res.json({ slots: taken });
    }

    // Admin: svi termini
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

  // ── POST — nova rezervacija (status: pending) ─────────────────
  if (req.method === 'POST') {
    const { name, phone, email, service, date, time, note } = req.body;
    if (!name || !phone || !service || !date || !time)
      return res.status(400).json({ error: 'Nedostaju obavezni podaci' });

    // Provjeri duplikat
    const taken = await redis.sismember(`slots:${date}`, time);
    if (taken) return res.status(409).json({ error: 'Termin je već zauzet' });

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const datetime = `${date}T${time}`;
    const appt = {
      id, name, phone,
      email: email || '',
      service, date, time, datetime,
      note: note || '',
      createdAt: new Date().toISOString(),
      status: 'pending'   // ← čeka potvrdu vlasnika
    };

    await redis.set(`appt:${id}`, JSON.stringify(appt));
    await redis.sadd(`slots:${date}`, time);
    await redis.expire(`slots:${date}`, 60 * 60 * 24 * 90);

    // Email notifikacija vlasniku
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Beauty Mess <noreply@beauty-mess.hr>',
            to: process.env.OWNER_EMAIL || 'anita@beauty-mess.hr',
            subject: `⏳ Nova rezervacija čeka potvrdu — ${name} · ${date} u ${time}`,
            html: `<h2>Nova rezervacija čeka tvoju potvrdu!</h2>
              <table style="border-collapse:collapse">
                <tr><td style="padding:4px 12px 4px 0"><b>Ime:</b></td><td>${name}</td></tr>
                <tr><td style="padding:4px 12px 4px 0"><b>Telefon:</b></td><td>${phone}</td></tr>
                <tr><td style="padding:4px 12px 4px 0"><b>Usluga:</b></td><td>${service}</td></tr>
                <tr><td style="padding:4px 12px 4px 0"><b>Datum:</b></td><td>${date}</td></tr>
                <tr><td style="padding:4px 12px 4px 0"><b>Vrijeme:</b></td><td>${time}</td></tr>
                ${note ? `<tr><td style="padding:4px 12px 4px 0"><b>Napomena:</b></td><td>${note}</td></tr>` : ''}
              </table>
              <br><a href="${process.env.SITE_URL || ''}/admin" style="background:#1c1812;color:#fff;padding:10px 20px;border-radius:20px;text-decoration:none;font-size:14px">Otvori admin panel →</a>`
          })
        });
      } catch(e) { console.error('Email error:', e.message); }
    }

    return res.status(201).json({ success: true, appointment: appt });
  }

  // ── PATCH — potvrdi termin (admin only) ──────────────────────
  if (req.method === 'PATCH') {
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    const raw = await redis.get(`appt:${id}`);
    if (!raw) return res.status(404).json({ error: 'Termin nije pronađen' });

    const appt = typeof raw === 'string' ? JSON.parse(raw) : raw;
    appt.status = 'confirmed';
    appt.confirmedAt = new Date().toISOString();
    await redis.set(`appt:${id}`, JSON.stringify(appt));

    // Email klijentu — potvrda
    if (process.env.RESEND_API_KEY && appt.email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Beauty Mess <noreply@beauty-mess.hr>',
            to: appt.email,
            subject: `✅ Termin potvrđen — Beauty Mess · ${appt.date} u ${appt.time}`,
            html: `<h2>Tvoj termin je potvrđen!</h2>
              <p>Draga ${appt.name},</p>
              <p>Tvoja rezervacija je potvrđena. Vidimo se!</p>
              <table style="border-collapse:collapse">
                <tr><td style="padding:4px 12px 4px 0"><b>Usluga:</b></td><td>${appt.service}</td></tr>
                <tr><td style="padding:4px 12px 4px 0"><b>Datum:</b></td><td>${appt.date}</td></tr>
                <tr><td style="padding:4px 12px 4px 0"><b>Vrijeme:</b></td><td>${appt.time}</td></tr>
              </table>
              <p style="margin-top:16px">Beauty Mess · Brune Bušića 9, Zagreb · 098 554 037</p>`
          })
        });
      } catch(e) { console.error('Confirm email error:', e.message); }
    }

    return res.json({ success: true, appointment: appt });
  }

  // ── DELETE — otkaži (admin only) ──────────────────────────────
  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID required' });

    const raw = await redis.get(`appt:${id}`);
    if (!raw) return res.status(404).json({ error: 'Termin nije pronađen' });

    const appt = typeof raw === 'string' ? JSON.parse(raw) : raw;
    await redis.del(`appt:${id}`);
    await redis.srem(`slots:${appt.date}`, appt.time);

    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
