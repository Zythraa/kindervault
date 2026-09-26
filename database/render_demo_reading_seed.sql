-- KinderVault FYP Render/TiDB Reading Progress demo fixture.
-- Run this only in the TiDB Cloud SQL Editor after the DEMO26 students exist.
-- Do not run it against the local WAMP database.

USE `kindervault`;

START TRANSACTION;

CREATE TEMPORARY TABLE kv_demo_reading_fixture (
  code VARCHAR(30) NOT NULL,
  record_quarter VARCHAR(12) NOT NULL,
  record_date DATE NOT NULL,
  has_bm TINYINT(1) NOT NULL,
  has_bi TINYINT(1) NOT NULL,
  bm_book_level TINYINT UNSIGNED NOT NULL,
  bm_page INT UNSIGNED NOT NULL,
  bi_book_level TINYINT UNSIGNED NOT NULL,
  bi_page INT UNSIGNED NOT NULL,
  notes TEXT NOT NULL
);

INSERT INTO kv_demo_reading_fixture VALUES
  ('DEMO26-01','2026-Q1','2026-01-16',1,1,1,8,1,5,'Bacaan awal tahun menunjukkan kemajuan yang baik.'),
  ('DEMO26-01','2026-Q1','2026-03-20',1,1,2,16,1,12,'Mula membaca ayat pendek dengan lebih yakin.'),
  ('DEMO26-02','2026-Q1','2026-02-13',1,0,1,10,1,0,'Bahasa Melayu direkodkan; Bahasa Inggeris belum dinilai.'),
  ('DEMO26-03','2026-Q2','2026-04-17',0,1,1,0,2,14,'English reading only for this session.'),
  ('DEMO26-04','2026-Q2','2026-05-15',1,1,2,22,2,18,'Boleh mengenal perkataan mudah dalam kedua-dua bahasa.'),
  ('DEMO26-04','2026-Q3','2026-08-14',1,0,3,30,1,0,'BM record updated; BI session ditangguhkan.'),
  ('DEMO26-05','2026-Q2','2026-06-19',1,1,3,28,2,20,'Membaca dengan sebutan yang semakin jelas.'),
  ('DEMO26-06','2026-Q1','2026-01-23',0,1,1,0,1,7,'English progress recorded for demonstration.'),
  ('DEMO26-07','2026-Q3','2026-07-10',1,1,2,24,2,17,'Perlu sedikit bimbingan pada perkataan baharu.'),
  ('DEMO26-08','2026-Q3','2026-09-04',1,0,4,36,1,0,'BM sahaja direkodkan pada tarikh ini.'),
  ('DEMO26-09','2026-Q1','2026-03-13',1,1,2,19,3,23,'Rekod bacaan sintetik untuk ujian sejarah pelajar.'),
  ('DEMO26-10','2026-Q2','2026-04-24',1,1,1,11,1,9,'Masih berlatih membaca dengan lancar.'),
  ('DEMO26-11','2026-Q2','2026-05-22',0,1,1,0,3,27,'English book level lebih tinggi untuk variasi data.'),
  ('DEMO26-11','2026-Q3','2026-09-11',1,1,4,41,4,35,'Kemajuan konsisten dalam sesi terkini.'),
  ('DEMO26-12','2026-Q2','2026-06-26',1,1,3,33,2,21,'Rekod penutup semester sintetik.');

INSERT INTO reading_progress_records
  (student_id, quarter, record_date, has_bm, has_bi, bm_book_level, bm_page,
   bi_book_level, bi_page, notes)
SELECT s.id, f.record_quarter, f.record_date, f.has_bm, f.has_bi, f.bm_book_level,
       f.bm_page, f.bi_book_level, f.bi_page, f.notes
FROM kv_demo_reading_fixture f
JOIN students s ON s.code = f.code
WHERE NOT EXISTS (
  SELECT 1 FROM reading_progress_records r
  WHERE r.student_id = s.id
    AND r.record_date = f.record_date
    AND r.quarter = f.record_quarter
);

DROP TEMPORARY TABLE kv_demo_reading_fixture;
COMMIT;

SELECT 'Render Reading Progress demo fixture complete' AS result,
       COUNT(*) AS demo_reading_records
FROM reading_progress_records r
JOIN students s ON s.id = r.student_id
WHERE s.code LIKE 'DEMO26-%';
