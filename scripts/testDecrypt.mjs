import crypto from 'crypto';

const desKey = '38346591';
const enc = 'ID2ieOjCrwfgWvL5sXl4B1ImC5QfbsDyAYSpkEihdkG4+AFn1gYNkJM9bhyDhDoC00is5zg9wSEUPgFYtzlXCxw7tS9a8Gtq';

const decipher = crypto.createDecipheriv('des-ecb', Buffer.from(desKey, 'utf-8'), null);
decipher.setAutoPadding(true);
let decrypted = decipher.update(enc, 'base64', 'utf8');
decrypted += decipher.final('utf8');
console.log('DECRYPTED DIRECT URL:', decrypted.trim());

const url320 = decrypted.trim().replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4');
console.log('320KBPS URL:', url320);

fetch(url320, { method: 'HEAD' }).then(r => console.log('HTTP Status:', r.status, 'Size:', r.headers.get('content-length')));
