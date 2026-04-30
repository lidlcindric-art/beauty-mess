# 💅 Beauty Mess — Online rezervacijski sustav

Salon za uljepšavanje, Brune Bušića 18, Središće Zagreb.

## Stack

- **Frontend**: Vanilla HTML/CSS/JS (scroll animacije, kalendar, booking forma)
- **Backend**: Vercel Serverless Functions
- **Baza**: Upstash Redis (free tier — besplatno, bez kreditne kartice)
- **Email notifikacije**: Resend (free tier — 3000 emailova/mj besplatno)

## Setup — 10 minuta

### 1. Upstash Redis (besplatna baza termina)

1. Idi na [upstash.com](https://upstash.com) → Create Database → Free tier
2. Kopiraj `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`

### 2. Resend (email notifikacije na mobitel)

1. Idi na [resend.com](https://resend.com) → besplatna registracija
2. Dodaj svoju domenu ili koristi sandbox za testiranje
3. Kopiraj `RESEND_API_KEY`

### 3. Vercel Environment Variables

U Vercel dashboardu → Settings → Environment Variables dodaj:

```
UPSTASH_REDIS_REST_URL     = https://...upstash.io
UPSTASH_REDIS_REST_TOKEN   = AXxx...
ADMIN_KEY                  = tajnalozinka123
RESEND_API_KEY             = re_xxx...
OWNER_EMAIL                = anita@email.com
SITE_URL                   = https://beauty-mess.vercel.app
```

### 4. Lokalni razvoj

```bash
npm install
echo "UPSTASH_REDIS_REST_URL=..." > .env.local
echo "UPSTASH_REDIS_REST_TOKEN=..." >> .env.local
echo "ADMIN_KEY=moja-lozinka" >> .env.local
vercel dev
```

## Kako radi booking sustav

```
Klijent bira datum → kalendar pokazuje slobodne termini (zeleni/crveni)
Klijent bira termin → upisuje ime, telefon, uslugu
Potvrda → termin se sprema u Redis → email notifikacija Aniti
Anita otvori /admin (gumb ⚙️ dolje lijevo) → unosi lozinku → vidi sve termine
```

## Admin panel

- URL: Stranica (gumb ⚙️ doljnji lijevi kut)
- Lozinka: Ona koju si postavio/la u `ADMIN_KEY`
- Može: vidjeti sve termine, filtrirati po datumu, otkazati termine

## Sync s mobitelom

- Anita prima **email** na mobitel za svaki novi termin
- Admin panel je **mobile-responsive** — radi savršeno na telefonu
- Buduća nadogradnja: Web Push notifikacije (PWA)

## Struktura

```
beauty-mess/
├── public/
│   └── index.html          ← Cijela aplikacija (landing + booking + admin)
├── api/
│   └── appointments.js     ← CRUD API (GET/POST/DELETE)
├── vercel.json
└── package.json
```
