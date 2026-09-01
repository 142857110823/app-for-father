const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const accessKey = process.env.ADMIN_ACCESS_KEY || crypto.randomBytes(18).toString('base64url');
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  const target = path.join(__dirname, '..', 'admin-credentials.local.json');
  const credentials = {
    username,
    accessKeyHash: await bcrypt.hash(accessKey, 12),
    passwordHash: await bcrypt.hash(password, 12),
    jwtSecret: crypto.randomBytes(32).toString('hex'),
  };
  fs.writeFileSync(target, `${JSON.stringify(credentials, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(JSON.stringify({ username, accessKey, password, file: target }, null, 2));
}

main().catch(error => {
  if (error.code === 'EEXIST') {
    console.error('凭据文件已存在，未覆盖。');
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
