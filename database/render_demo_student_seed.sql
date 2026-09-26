-- KinderVault FYP Render/TiDB demo fixture.
-- Run this only in the TiDB Cloud SQL Editor for the deployed FYP database.
-- Do not run it against the local WAMP database.

START TRANSACTION;

INSERT IGNORE INTO students
  (code, name, ic, birth_cert, gender, dob, child_position, program_age, monthly_package,
   class, parent, father_name, father_phone, mother_name, mother_phone, phone, address, fee, status, enrol)
VALUES
  ('DEMO26-01','Muhammad Aiman bin Hakim','DEMO-IC-0001','DEMO-BC-0001','M','2022-02-14','2','4','A','Permata','Synthetic Parent 1','Father Demo 1','011-7000-0001','Mother Demo 1','012-7000-0001','013-7000-0001','Synthetic demo address 1, Selangor',230.00,'Active','2026-01-05'),
  ('DEMO26-02','Nur Aisyah binti Rahman','DEMO-IC-0002','DEMO-BC-0002','F','2022-07-09','3','4','B','Permata','Synthetic Parent 2','Father Demo 2','011-7000-0002','Mother Demo 2','012-7000-0002','013-7000-0002','Synthetic demo address 2, Selangor',320.00,'Active','2026-01-12'),
  ('DEMO26-03','Danish Irfan bin Azmi','DEMO-IC-0003','DEMO-BC-0003','M','2022-11-21','1','4','C','Permata','Synthetic Parent 3','Father Demo 3','011-7000-0003','Mother Demo 3','012-7000-0003','013-7000-0003','Synthetic demo address 3, Selangor',430.00,'Active','2026-02-02'),
  ('DEMO26-04','Siti Nur Iman binti Zulkifli','DEMO-IC-0004','DEMO-BC-0004','F','2022-04-30','2','4','A','Permata','Synthetic Parent 4','Father Demo 4','011-7000-0004','Mother Demo 4','012-7000-0004','013-7000-0004','Synthetic demo address 4, Selangor',230.00,'Active','2026-02-16'),
  ('DEMO26-05','Adam Rayyan bin Faizal','DEMO-IC-0005','DEMO-BC-0005','M','2022-09-18','3','4','B','Permata','Synthetic Parent 5','Father Demo 5','011-7000-0005','Mother Demo 5','012-7000-0005','013-7000-0005','Synthetic demo address 5, Selangor',320.00,'Active','2026-03-02'),
  ('DEMO26-06','Nur Alya Sofea binti Rizal','DEMO-IC-0006','DEMO-BC-0006','F','2021-01-26','1','5','C','Intelek','Synthetic Parent 6','Father Demo 6','011-7000-0006','Mother Demo 6','012-7000-0006','013-7000-0006','Synthetic demo address 6, Selangor',430.00,'Active','2026-01-05'),
  ('DEMO26-07','Haziq Danish bin Shukri','DEMO-IC-0007','DEMO-BC-0007','M','2021-06-12','2','5','A','Intelek','Synthetic Parent 7','Father Demo 7','011-7000-0007','Mother Demo 7','012-7000-0007','013-7000-0007','Synthetic demo address 7, Selangor',230.00,'Active','2026-01-19'),
  ('DEMO26-08','Puteri Balqis binti Amir','DEMO-IC-0008','DEMO-BC-0008','F','2021-10-05','3','5','B','Intelek','Synthetic Parent 8','Father Demo 8','011-7000-0008','Mother Demo 8','012-7000-0008','013-7000-0008','Synthetic demo address 8, Selangor',320.00,'Active','2026-02-09'),
  ('DEMO26-09','Muhammad Harith bin Azlan','DEMO-IC-0009','DEMO-BC-0009','M','2021-03-17','1','5','C','Intelek','Synthetic Parent 9','Father Demo 9','011-7000-0009','Mother Demo 9','012-7000-0009','013-7000-0009','Synthetic demo address 9, Selangor',430.00,'Active','2026-02-23'),
  ('DEMO26-10','Nur Qistina Balqis binti Ismail','DEMO-IC-0010','DEMO-BC-0010','F','2021-08-28','2','5','A','Intelek','Synthetic Parent 10','Father Demo 10','011-7000-0010','Mother Demo 10','012-7000-0010','013-7000-0010','Synthetic demo address 10, Selangor',230.00,'Active','2026-03-09'),
  ('DEMO26-11','Iman Hakeem bin Rosli','DEMO-IC-0011','DEMO-BC-0011','M','2021-12-03','3','6','B','Ceria','Synthetic Parent 11','Father Demo 11','011-7000-0011','Mother Demo 11','012-7000-0011','013-7000-0011','Synthetic demo address 11, Selangor',320.00,'Active','2026-01-05'),
  ('DEMO26-12','Aina Sofea binti Nabil','DEMO-IC-0012','DEMO-BC-0012','F','2020-02-19','1','6','C','Ceria','Synthetic Parent 12','Father Demo 12','011-7000-0012','Mother Demo 12','012-7000-0012','013-7000-0012','Synthetic demo address 12, Selangor',430.00,'Active','2026-01-26'),
  ('DEMO26-13','Arif Hakim bin Jamal','DEMO-IC-0013','DEMO-BC-0013','M','2020-05-11','2','6','A','Ceria','Synthetic Parent 13','Father Demo 13','011-7000-0013','Mother Demo 13','012-7000-0013','013-7000-0013','Synthetic demo address 13, Selangor',230.00,'Active','2026-02-16'),
  ('DEMO26-14','Nurin Syafiqah binti Kamarul','DEMO-IC-0014','DEMO-BC-0014','F','2020-09-24','3','6','B','Ceria','Synthetic Parent 14','Father Demo 14','011-7000-0014','Mother Demo 14','012-7000-0014','013-7000-0014','Synthetic demo address 14, Selangor',320.00,'Active','2026-03-02'),
  ('DEMO26-15','Muhammad Rayyan Idris','DEMO-IC-0015','DEMO-BC-0015','M','2020-12-15','1','6','C','Ceria','Synthetic Parent 15','Father Demo 15','011-7000-0015','Mother Demo 15','012-7000-0015','013-7000-0015','Synthetic demo address 15, Selangor',430.00,'Active','2026-03-16'),
  ('DEMO26-16','Qaisara Humaira binti Firdaus','DEMO-IC-0016','DEMO-BC-0016','F','2022-01-08','2','4','A','Permata','Synthetic Parent 16','Father Demo 16','011-7000-0016','Mother Demo 16','012-7000-0016','013-7000-0016','Synthetic demo address 16, Selangor',230.00,'Active','2026-04-06'),
  ('DEMO26-17','Amirul Haziq bin Salleh','DEMO-IC-0017','DEMO-BC-0017','M','2021-02-27','3','5','B','Intelek','Synthetic Parent 17','Father Demo 17','011-7000-0017','Mother Demo 17','012-7000-0017','013-7000-0017','Synthetic demo address 17, Selangor',320.00,'Active','2026-04-20'),
  ('DEMO26-18','Nur Damia binti Azhar','DEMO-IC-0018','DEMO-BC-0018','F','2020-07-16','1','6','C','Ceria','Synthetic Parent 18','Father Demo 18','011-7000-0018','Mother Demo 18','012-7000-0018','013-7000-0018','Synthetic demo address 18, Selangor',430.00,'Active','2026-05-04'),
  ('DEMO26-19','Muhammad Danish bin Amrul','DEMO-IC-0019','DEMO-BC-0019','M','2022-06-06','2','4','A','Permata','Synthetic Parent 19','Father Demo 19','011-7000-0019','Mother Demo 19','012-7000-0019','013-7000-0019','Synthetic demo address 19, Selangor',230.00,'Active','2026-05-18'),
  ('DEMO26-20','Hannah Maisarah binti Faiz','DEMO-IC-0020','DEMO-BC-0020','F','2021-11-29','3','5','B','Intelek','Synthetic Parent 20','Father Demo 20','011-7000-0020','Mother Demo 20','012-7000-0020','013-7000-0020','Synthetic demo address 20, Selangor',320.00,'Active','2026-06-01');

CREATE TEMPORARY TABLE kv_demo_payment_fixture (
  code VARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  month VARCHAR(255) NOT NULL,
  payment_date DATE NULL,
  status VARCHAR(20) NOT NULL,
  method VARCHAR(50) NOT NULL,
  ref VARCHAR(100) NOT NULL,
  receipt VARCHAR(50) NOT NULL,
  notes TEXT NOT NULL
);

INSERT INTO kv_demo_payment_fixture VALUES
  ('DEMO26-01',230.00,'2026-09','2026-09-26','Paid','Cash','DEMO26-PAY-01','RCP-DEMO26-01','Synthetic Render demo data only'),
  ('DEMO26-02',320.00,'2026-09',NULL,'Unpaid','','DEMO26-PAY-02','','Synthetic Render demo data only'),
  ('DEMO26-03',860.00,'2026-10,2026-11','2026-09-26','Advance','Bank Transfer','DEMO26-PAY-03','RCP-DEMO26-03','Synthetic Render demo data only'),
  ('DEMO26-04',230.00,'2026-08','2026-08-05','Overdue','','DEMO26-PAY-04','','Synthetic Render demo data only'),
  ('DEMO26-05',640.00,'2026-08,2026-09','2026-09-26','Paid','QR DuitNow','DEMO26-PAY-05','RCP-DEMO26-05','Synthetic Render demo data only'),
  ('DEMO26-06',430.00,'2026-09','2026-09-26','Paid','Cash','DEMO26-PAY-06','RCP-DEMO26-06','Synthetic Render demo data only'),
  ('DEMO26-07',230.00,'2026-09',NULL,'Unpaid','','DEMO26-PAY-07','','Synthetic Render demo data only'),
  ('DEMO26-08',640.00,'2026-10,2026-11','2026-09-26','Advance','Bank Transfer','DEMO26-PAY-08','RCP-DEMO26-08','Synthetic Render demo data only'),
  ('DEMO26-09',430.00,'2026-08','2026-08-05','Overdue','','DEMO26-PAY-09','','Synthetic Render demo data only'),
  ('DEMO26-10',460.00,'2026-08,2026-09','2026-09-26','Paid','QR DuitNow','DEMO26-PAY-10','RCP-DEMO26-10','Synthetic Render demo data only'),
  ('DEMO26-11',320.00,'2026-09','2026-09-26','Paid','Cash','DEMO26-PAY-11','RCP-DEMO26-11','Synthetic Render demo data only'),
  ('DEMO26-12',430.00,'2026-09',NULL,'Unpaid','','DEMO26-PAY-12','','Synthetic Render demo data only'),
  ('DEMO26-13',460.00,'2026-10,2026-11','2026-09-26','Advance','Bank Transfer','DEMO26-PAY-13','RCP-DEMO26-13','Synthetic Render demo data only'),
  ('DEMO26-14',320.00,'2026-08','2026-08-05','Overdue','','DEMO26-PAY-14','','Synthetic Render demo data only'),
  ('DEMO26-15',860.00,'2026-08,2026-09','2026-09-26','Paid','QR DuitNow','DEMO26-PAY-15','RCP-DEMO26-15','Synthetic Render demo data only'),
  ('DEMO26-16',230.00,'2026-09','2026-09-26','Paid','Cash','DEMO26-PAY-16','RCP-DEMO26-16','Synthetic Render demo data only'),
  ('DEMO26-17',320.00,'2026-09',NULL,'Unpaid','','DEMO26-PAY-17','','Synthetic Render demo data only'),
  ('DEMO26-18',860.00,'2026-10,2026-11','2026-09-26','Advance','Bank Transfer','DEMO26-PAY-18','RCP-DEMO26-18','Synthetic Render demo data only'),
  ('DEMO26-19',230.00,'2026-08','2026-08-05','Overdue','','DEMO26-PAY-19','','Synthetic Render demo data only'),
  ('DEMO26-20',640.00,'2026-08,2026-09','2026-09-26','Paid','QR DuitNow','DEMO26-PAY-20','RCP-DEMO26-20','Synthetic Render demo data only');

INSERT INTO payments (student_id, type, amount, month, date, status, method, ref, receipt, notes)
SELECT s.id, 'Monthly Fee', d.amount, d.month, d.payment_date, d.status, d.method, d.ref, d.receipt, d.notes
FROM kv_demo_payment_fixture d
JOIN students s ON s.code = d.code
WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.ref = d.ref);

DROP TEMPORARY TABLE kv_demo_payment_fixture;
COMMIT;

SELECT 'Render demo fixture complete' AS result,
       COUNT(*) AS demo_students
FROM students
WHERE code LIKE 'DEMO26-%';
