const crypto = require('crypto');
const SALT = "asset_plan_secure_salt_2026_xyz";
const password = "123456";
const hash = crypto.createHash('sha256').update(password + SALT).digest('hex');
console.log(hash);
