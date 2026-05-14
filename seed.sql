
INSERT INTO users (email, password_hash, global_role) VALUES 
('admin@asset.com', '08b7f6bb6238d47d2be4b27b593f5cc834caac758dfd6fe780f9dc2e52eda8d1', 'ADMIN'),
('center@asset.com', '08b7f6bb6238d47d2be4b27b593f5cc834caac758dfd6fe780f9dc2e52eda8d1', 'STORE_CENTER'),
('site@asset.com', '08b7f6bb6238d47d2be4b27b593f5cc834caac758dfd6fe780f9dc2e52eda8d1', 'USER');

INSERT INTO projects (id, name) VALUES 
('P1', 'P1 - โครงการคอนโด A'),
('P2', 'P2 - โครงการหมู่บ้าน B');

-- Note: user id 3 is site@asset.com
INSERT INTO project_roles (user_id, project_id, role) VALUES 
(3, 'P1', 'STORE_SITE'),
(3, 'P2', 'STORE_SITE');
  