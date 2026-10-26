-- Migration 0002: Seed Ethiopian Banks & Payment Providers

INSERT OR IGNORE INTO banks (id, name, is_active) VALUES
(1, 'Commercial Bank of Ethiopia', 1),
(2, 'Awash Bank', 1),
(3, 'Bank of Abyssinia', 1),
(4, 'Dashen Bank', 1),
(5, 'Telebirr', 1),
(6, 'CBE Birr', 1),
(7, 'Hibret Bank', 1),
(8, 'Nib International Bank', 1),
(9, 'Cooperative Bank of Oromia', 1),
(10, 'Sinqee Bank', 1);
