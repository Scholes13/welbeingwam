-- Seed random clues to existing QR spots
UPDATE qr_spots SET clue = 'Cari di dekat pintu masuk utama, di sebelah kiri tanaman hijau.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 0);

UPDATE qr_spots SET clue = 'Lihat ke arah langit-langit di area lobby, ada sesuatu yang tersembunyi.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 1);

UPDATE qr_spots SET clue = 'Di dekat area minuman, perhatikan dinding dengan poster wellness.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 2);

UPDATE qr_spots SET clue = 'Coba cek area yoga mat, biasanya ada di sudut ruangan.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 3);

UPDATE qr_spots SET clue = 'Jalan menuju toilet, lihat ke kanan sebelum masuk.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 4);

UPDATE qr_spots SET clue = 'Di taman outdoor, dekat bangku kayu favorit untuk meditasi.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 5);

UPDATE qr_spots SET clue = 'Area resepsionis, cek meja informasi dengan cermat.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 6);

UPDATE qr_spots SET clue = 'Dekat tangga, di lantai bawah ada sesuatu yang menunggu.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 7);

UPDATE qr_spots SET clue = 'Di balik pintu ruang ganti, jangan lupa lihat ke atas!' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 8);

UPDATE qr_spots SET clue = 'Area parkir, dekat motor atau sepeda, ada petunjuk tersembunyi.' WHERE clue IS NULL AND id IN (SELECT id FROM qr_spots ORDER BY created_at LIMIT 1 OFFSET 9);
