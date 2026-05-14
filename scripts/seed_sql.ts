import { hashPassword } from "../src/lib/password";
import fs from "fs";

async function generate() {
  const pw = await hashPassword("123456");
  const sql = `
INSERT INTO users (email, password_hash, global_role) VALUES 
('admin@asset.com', '${pw}', 'ADMIN'),
('center@asset.com', '${pw}', 'STORE_CENTER'),
('site@asset.com', '${pw}', 'USER');

INSERT INTO projects (id, name) VALUES 
('P1', 'P1 - โครงการคอนโด A'),
('P2', 'P2 - โครงการหมู่บ้าน B');

-- Note: user id 3 is site@asset.com
INSERT INTO project_roles (user_id, project_id, role) VALUES 
(3, 'P1', 'STORE_SITE'),
(3, 'P2', 'STORE_SITE');
  `;
  fs.writeFileSync("seed.sql", sql);
  console.log("seed.sql generated");
}

generate().catch(console.error);
