-- KinderVault FYP Render/TiDB KPM development demo fixture.
-- Run this only in the TiDB Cloud SQL Editor after the DEMO26 students exist.
-- Do not run it against the local WAMP database.

USE `kindervault`;

START TRANSACTION;

CREATE TEMPORARY TABLE kv_demo_development_fixture (
  code VARCHAR(30) NOT NULL,
  record_month VARCHAR(7) NOT NULL,
  assessment_date DATE NOT NULL,
  age_group TINYINT UNSIGNED NOT NULL,
  checklist_json LONGTEXT NOT NULL,
  assessor_name VARCHAR(120) NOT NULL,
  assessment_place VARCHAR(255) NOT NULL,
  comment TEXT NOT NULL,
  bm_book_level TINYINT UNSIGNED NOT NULL,
  bm_page INT UNSIGNED NOT NULL,
  bi_book_level TINYINT UNSIGNED NOT NULL,
  bi_page INT UNSIGNED NOT NULL
);

INSERT INTO kv_demo_development_fixture VALUES
  ('DEMO26-01','2026-01','2026-01-12',4,'{"1":"/","2":"/","3":"X","4":"/","5":"/","note_3":"Perlu lebih yakin ketika berlari."}','Cikgu Demo A','Synthetic classroom','Kemajuan awal yang baik dengan satu kemahiran perlu diperkukuh.',2,12,1,8),
  ('DEMO26-01','2026-03','2026-03-18',4,'{"1":"/","2":"/","3":"/","4":"/","5":"/","6":"X","note_6":"Latihan menggunting diteruskan."}','Cikgu Demo A','Synthetic classroom','Lima kemahiran dicapai; latihan motor halus diteruskan.',2,20,2,14),
  ('DEMO26-02','2026-02','2026-02-18',4,'{"1":"/","2":"X","3":"X","4":"/","5":"/","note_2":"Masih perlukan panduan semasa aktiviti pergerakan."}','Cikgu Demo B','Synthetic classroom','Memerlukan bimbingan sederhana dalam motor kasar.',1,7,1,5),
  ('DEMO26-03','2026-04','2026-04-09',4,'{"1":"/","2":"/","3":"/","4":"/","5":"/","6":"/","7":"/","8":"/","9":"/","note_8":"Boleh menerangkan objek dengan jelas."}','Cikgu Demo C','Synthetic classroom','Semua item utama yang dinilai dicapai.',3,25,2,18),
  ('DEMO26-04','2026-05','2026-05-14',4,'{"1":"X","2":"X","3":"/","4":"X","5":"/","6":"X","7":"/","note_1":"Perlukan aktiviti fizikal berulang."}','Cikgu Demo A','Synthetic classroom','Rekod susulan menunjukkan kemahiran masih berkembang.',1,4,1,3),
  ('DEMO26-05','2026-06','2026-06-20',4,'{"1":"/","2":"/","3":"/","4":"/","5":"/","6":"/","7":"/","8":"X","9":"/","10":"/","note_8":"Galakkan penggunaan ayat lebih panjang."}','Cikgu Demo B','Synthetic classroom','Kemajuan konsisten dan komunikasi semakin jelas.',3,31,2,22),
  ('DEMO26-06','2026-01','2026-01-15',5,'{"1":"/","2":"X","3":"/","4":"/","5":"/","6":"X","7":"/","8":"/","note_2":"Perlu masa untuk menguasai skipping."}','Cikgu Demo C','Synthetic classroom','Sebahagian besar kemahiran dicapai.',2,15,2,11),
  ('DEMO26-07','2026-03','2026-03-11',5,'{"1":"/","2":"/","3":"/","4":"/","5":"/","6":"/","7":"/","8":"/","9":"/","10":"X","11":"/","note_10":"Latihan berkongsi dan menunggu giliran."}','Cikgu Demo A','Synthetic classroom','Kemahiran akademik baik; satu kemahiran sosial perlu dipantau.',4,28,3,20),
  ('DEMO26-08','2026-07','2026-07-08',5,'{"1":"X","2":"/","3":"X","4":"/","5":"/","6":"/","7":"/","8":"X","9":"/","note_8":"Perlu ulang ayat dengan lebih perlahan."}','Cikgu Demo B','Synthetic classroom','Pencapaian bercampur dengan beberapa item belum dicapai.',2,19,2,16),
  ('DEMO26-09','2026-09','2026-09-10',5,'{"1":"/","2":"/","3":"/","4":"/","5":"/","6":"/","7":"/","8":"/","9":"/","10":"/","11":"/","12":"/","13":"/","14":"/","15":"/"}','Cikgu Demo C','Synthetic classroom','Semua 15 item checklist dicapai dalam penilaian demo.',5,42,4,30),
  ('DEMO26-10','2026-03','2026-03-21',5,'{"1":"/","2":"X","3":"/","4":"X","5":"/","6":"/","7":"X","8":"/","9":"/","note_7":"Teruskan aktiviti perbandingan objek."}','Cikgu Demo A','Synthetic classroom','Kemajuan sedang diperhatikan untuk beberapa kemahiran.',2,13,1,9),
  ('DEMO26-11','2026-04','2026-04-16',6,'{"1":"/","2":"/","3":"/","4":"/","5":"/","6":"/","7":"X","8":"/","9":"/","10":"/","11":"/","12":"/","note_7":"Sebutan semakin jelas dengan latihan."}','Cikgu Demo B','Synthetic classroom','Kemahiran fizikal dan kognitif menunjukkan kemajuan baik.',4,26,3,21),
  ('DEMO26-12','2026-05','2026-05-23',6,'{"1":"X","2":"/","3":"/","4":"X","5":"/","6":"/","7":"/","8":"X","9":"/","10":"/","11":"/","12":"/","13":"/","14":"X","note_14":"Latihan menulis nama akan diteruskan."}','Cikgu Demo C','Synthetic classroom','Beberapa kemahiran memerlukan aktiviti pengukuhan.',3,18,2,12);

INSERT INTO dev_records
  (student_id, month, record_type, assessment_date, assessment_place, assessor_name,
   age_group, checklist_json, comment, bm_book_level, bm_page, bi_book_level, bi_page)
SELECT s.id, f.record_month, 'kpm', f.assessment_date, f.assessment_place, f.assessor_name,
       f.age_group, f.checklist_json, f.comment, f.bm_book_level, f.bm_page,
       f.bi_book_level, f.bi_page
FROM kv_demo_development_fixture f
JOIN students s ON s.code = f.code
WHERE NOT EXISTS (
  SELECT 1 FROM dev_records d
  WHERE d.student_id = s.id
    AND d.month = f.record_month
    AND d.record_type = 'kpm'
);

DROP TEMPORARY TABLE kv_demo_development_fixture;
COMMIT;

SELECT 'Render KPM development demo fixture complete' AS result,
       COUNT(*) AS demo_development_records
FROM dev_records d
JOIN students s ON s.id = d.student_id
WHERE s.code LIKE 'DEMO26-%' AND d.record_type = 'kpm';
