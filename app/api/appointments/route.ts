import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
const PREFIX = ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const view = searchParams.get('view')
  const adminKey = req.headers.get('x-admin-key')

  if (view === 'slots' && date) {
    const taken = await redis.smembers(PREFIX ? `${PREFIX}:slots:${date}` : `slots:${date}`) || []
    return NextResponse.json({ slots: taken })
  }
  if (adminKey === process.env.ADMIN_KEY) {
    const keys = await redis.keys(PREFIX ? `${PREFIX}:appt:*` : `appt:*`)
    if (!keys.length) return NextResponse.json({ appointments: [] })
    const appts = await redis.mget<string[]>(...keys)
    const list = appts.filter(Boolean)
      .map(a => typeof a === 'string' ? JSON.parse(a) : a)
      .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    return NextResponse.json({ appointments: list })
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, phone, email, service, date, time, note } = body
  if (!name || !phone || !service || !date || !time)
    return NextResponse.json({ error: 'Nedostaju podaci' }, { status: 400 })
  const taken = await redis.sismember(PREFIX ? `${PREFIX}:slots:${date}` : `slots:${date}`, time)
  if (taken) return NextResponse.json({ error: 'Termin je već zauzet' }, { status: 409 })
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const appt = { id, name, phone, email: email || '', service, date, time, datetime: `${date}T${time}`, note: note || '', createdAt: new Date().toISOString(), status: 'pending' }
  await redis.set(PREFIX ? `${PREFIX}:appt:${id}` : `appt:${id}`, JSON.stringify(appt))
  await redis.sadd(PREFIX ? `${PREFIX}:slots:${date}` : `slots:${date}`, time)
  await redis.expire(PREFIX ? `${PREFIX}:slots:${date}` : `slots:${date}`, 60 * 60 * 24 * 90)
  return NextResponse.json({ success: true, appointment: appt }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await redis.get<string>(PREFIX ? `${PREFIX}:appt:${id}` : `appt:${id}`)
  if (!raw) return NextResponse.json({ error: 'Nije pronađen' }, { status: 404 })
  const appt = typeof raw === 'string' ? JSON.parse(raw) : raw as any
  appt.status = 'confirmed'; appt.confirmedAt = new Date().toISOString()
  await redis.set(PREFIX ? `${PREFIX}:appt:${id}` : `appt:${id}`, JSON.stringify(appt))
  return NextResponse.json({ success: true, appointment: appt })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const raw = await redis.get<string>(PREFIX ? `${PREFIX}:appt:${id}` : `appt:${id}`)
  if (!raw) return NextResponse.json({ error: 'Nije pronađen' }, { status: 404 })
  const appt = typeof raw === 'string' ? JSON.parse(raw) : raw as any
  await redis.del(PREFIX ? `${PREFIX}:appt:${id}` : `appt:${id}`)
  await redis.srem(`${PREFIX}:slots:${appt.date}`, appt.time)
  return NextResponse.json({ success: true })
}
