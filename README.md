# REXZ Vercel Protected API

Vercel-native Node.js 24 project.

## Struktur
- `/` dashboard
- `/api/key/create` generate key
- `/api/key/list` list key
- `/api/key/revoke` revoke key
- `/api/activate` key + HWID -> short-lived session token
- `/api/script` protected raw script
- `/api/admin/script` save/load script
- `/api/bot/event` bot integration placeholder

## Storage
Gunakan Redis yang terhubung ke project Vercel. Redis di Vercel dipakai untuk keys,
sessions, HWID binding, dan rate limit.

Set environment variables:
- `ADMIN_PASSWORD`
- `CLIENT_SECRET`
- `REDIS_URL`
- `REDIS_TOKEN`
- optional `BOT_WEBHOOK_URL`

Jangan pakai prefix `NEXT_PUBLIC_` untuk secret.

## Deploy
1. Upload folder ke GitHub atau import ZIP ke project.
2. Install dependency: `npm install`.
3. Di Vercel, tambahkan Redis melalui Marketplace lalu set env vars.
4. Set `ADMIN_PASSWORD` dan `CLIENT_SECRET` dengan nilai acak panjang.
5. Redeploy.
6. Buka `/` untuk dashboard.

## Flow client
1. POST `/api/activate` dengan:
   `{ "key":"REXZ-...", "hwid":"unique-client-id" }`
2. Simpan `token` yang dikembalikan.
3. GET `/api/script` dengan:
   `Authorization: Bearer TOKEN`
   dan header `X-REXZ-CLIENT: CLIENT_SECRET`
4. Token hanya 15 menit dan tidak melebihi expiry key.

## HWID
`maxHwid` menentukan jumlah HWID yang boleh terikat ke satu key.
HWID di-hash SHA-256 sebelum disimpan.

## Bot
Set `BOT_WEBHOOK_URL` untuk menerima event dari create/revoke/activate.
Endpoint `/api/bot/event` juga disediakan sebagai placeholder.

## Browser protection
Endpoint script tidak bergantung pada User-Agent. Browser biasa tidak punya
session token yang valid. `X-REXZ-CLIENT` adalah lapisan tambahan, bukan bukti
identitas yang kuat karena client dapat meniru header.

## Batasan penting
Tidak ada cara untuk membuat plaintext script yang sudah diberikan ke client menjadi
mustahil untuk diambil oleh client tersebut. Server protection ini mencegah akses
unauthorized dan mengontrol lisensi; jangan menaruh secret server di script client.

## Security checklist
- HTTPS (Vercel menyediakan TLS)
- Admin password panjang dan unik
- CLIENT_SECRET panjang dan unik
- Jangan commit `.env`
- Gunakan Redis persistence sesuai kebutuhan
- Pantau Vercel logs
- Untuk skala besar, pindahkan bot event ke queue/webhook khusus
