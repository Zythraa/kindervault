-- MySQL dump 10.13  Distrib 8.4.7, for Win64 (x86_64)
--
-- Host: localhost    Database: kindervault
-- ------------------------------------------------------
-- Server version	8.4.7

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `app_settings`
--

DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `key` varchar(80) NOT NULL,
  `value_json` longtext NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `app_settings`
--

LOCK TABLES `app_settings` WRITE;
/*!40000 ALTER TABLE `app_settings` DISABLE KEYS */;
INSERT INTO `app_settings` VALUES ('fee_config','{\"annual\":{\"registration\":100,\"books\":{\"4\":380,\"5\":460,\"6\":560},\"uniform\":65,\"sports_uniform\":55,\"tudung\":20,\"lawatan\":100,\"sukan\":60,\"hadiah\":100,\"gambar\":90,\"iqra\":30},\"monthly_packages\":{\"A\":{\"label\":\"Tadika Sahaja\",\"amount\":230},\"B\":{\"label\":\"Tadika + Half Daycare\",\"amount\":320},\"C\":{\"label\":\"Tadika + Full Daycare\",\"amount\":430}}}','2026-08-25 13:52:08'),('security_config','{\"session_timeout_minutes\":60,\"password_min_length\":8,\"require_mixed_case\":false,\"require_number\":false,\"max_failed_logins\":5,\"lockout_minutes\":15}','2026-08-25 13:51:04');
/*!40000 ALTER TABLE `app_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username_snapshot` varchar(100) NOT NULL DEFAULT '',
  `user_name_snapshot` varchar(150) NOT NULL DEFAULT '',
  `user_role_snapshot` varchar(50) NOT NULL DEFAULT '',
  `action` varchar(80) NOT NULL,
  `module` varchar(100) NOT NULL DEFAULT '',
  `record_type` varchar(100) NOT NULL DEFAULT '',
  `record_id` varchar(100) NOT NULL DEFAULT '',
  `description` text NOT NULL,
  `metadata_json` longtext,
  `ip_address` varchar(64) NOT NULL DEFAULT '',
  `user_agent` varchar(500) NOT NULL DEFAULT '',
  `status` varchar(20) NOT NULL DEFAULT 'Success',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created_at` (`created_at`),
  KEY `idx_audit_user_id` (`user_id`),
  KEY `idx_audit_module_action` (`module`,`action`),
  KEY `idx_audit_status` (`status`),
  CONSTRAINT `fk_audit_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Success','2026-08-25 21:52:08'),(2,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:54:10'),(3,1,'admin','Administrator','Administrator','LOGIN_FAILED','Authentication','User','USER-1','Failed login attempt.','{\"account_locked\":false}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Failed','2026-08-25 21:55:25'),(4,1,'admin','Administrator','Administrator','LOGIN_FAILED','Authentication','User','USER-1','Failed login attempt.','{\"account_locked\":false}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Failed','2026-08-25 21:55:40'),(5,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Success','2026-08-25 21:56:34'),(6,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Success','2026-08-25 21:56:49'),(7,1,'admin','Administrator','Administrator','LOGOUT','Authentication','User','USER-1','Signed out of KinderVault.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:57:05'),(8,1,'admin','Administrator','Administrator','LOGIN_FAILED','Authentication','User','USER-1','Failed login attempt.','{\"account_locked\":false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Failed','2026-08-25 21:57:08'),(9,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Success','2026-08-25 21:57:10'),(10,1,'admin','Administrator','Administrator','LOGIN_FAILED','Authentication','User','USER-1','Failed login attempt.','{\"account_locked\":false}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Failed','2026-08-25 21:57:16'),(11,1,'admin','Administrator','Administrator','LOGIN_FAILED','Authentication','User','USER-1','Failed login attempt.','{\"account_locked\":false}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Failed','2026-08-25 21:57:28'),(12,1,'admin','Administrator','Administrator','LOGIN_FAILED','Authentication','User','USER-1','Failed login attempt.','{\"account_locked\":false}','::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Failed','2026-08-25 21:57:42'),(13,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT; Windows NT 10.0; en-MY) WindowsPowerShell/5.1.26100.9168','Success','2026-08-25 21:58:42'),(14,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:02'),(15,1,'admin','Administrator','Administrator','PASSWORD_CHANGED','Security','User','USER-1','Changed own password.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:20'),(16,1,'admin','Administrator','Administrator','FEE_SETTINGS_CHANGED','Settings','Fee Structure','fee_config','Updated the fee structure.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:20'),(17,1,'admin','Administrator','Administrator','LOGOUT','Authentication','User','USER-1','Signed out of KinderVault.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:24'),(18,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:26'),(19,1,'admin','Administrator','Administrator','CREATE','Payment Management','Payment','PAY-67','Recorded a payment.','{\"amount\":2100,\"status\":\"Advance\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:45'),(20,1,'admin','Administrator','Administrator','RECEIPT_GENERATED','Receipt Management','Receipt','RCP-2026-00049','Generated a receipt for a recorded payment.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:45'),(21,1,'admin','Administrator','Administrator','LOGOUT','Authentication','User','USER-1','Signed out of KinderVault.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 21:59:52'),(22,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','Success','2026-08-25 22:00:01'),(23,1,'admin','Administrator','Administrator','LOGIN','Authentication','User','USER-1','Successfully logged in.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','Success','2026-09-02 19:04:59'),(24,1,'admin','Administrator','Administrator','CREATE','Payment Management','Payment','PAY-68','Recorded a payment.','{\"amount\":210,\"status\":\"Advance\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','Success','2026-09-02 19:06:16'),(25,1,'admin','Administrator','Administrator','RECEIPT_GENERATED','Receipt Management','Receipt','RCP-2026-00050','Generated a receipt for a recorded payment.',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36','Success','2026-09-02 19:06:16');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `classes`
--

DROP TABLE IF EXISTS `classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=274 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `classes`
--

LOCK TABLES `classes` WRITE;
/*!40000 ALTER TABLE `classes` DISABLE KEYS */;
INSERT INTO `classes` VALUES (271,'Permata','2026-09-02 11:06:16'),(272,'Intelek','2026-09-02 11:06:16'),(273,'Ceria','2026-09-02 11:06:16');
/*!40000 ALTER TABLE `classes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dev_records`
--

DROP TABLE IF EXISTS `dev_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dev_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `month` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_date` date DEFAULT NULL,
  `assessment_place` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `assessor_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `age_group` tinyint(1) DEFAULT NULL,
  `checklist_json` longtext COLLATE utf8mb4_unicode_ci,
  `reading` tinyint(1) DEFAULT '3',
  `writing` tinyint(1) DEFAULT '3',
  `behaviour` enum('Needs Improvement','Satisfactory','Good','Excellent') COLLATE utf8mb4_unicode_ci DEFAULT 'Satisfactory',
  `comment` text COLLATE utf8mb4_unicode_ci,
  `record_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'legacy',
  `bm_book_level` tinyint(1) DEFAULT '1',
  `bm_page` int DEFAULT '0',
  `bi_book_level` tinyint(1) DEFAULT '1',
  `bi_page` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_month_type` (`student_id`,`month`,`record_type`),
  CONSTRAINT `dev_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dev_records`
--

LOCK TABLES `dev_records` WRITE;
/*!40000 ALTER TABLE `dev_records` DISABLE KEYS */;
INSERT INTO `dev_records` VALUES (1,2,'2025-04',NULL,'','',NULL,NULL,4,3,'Good','Aliya menunjukkan kemajuan yang baik. Perlu lebih latihan matematik.','legacy',1,0,1,0,'2026-05-26 23:10:24'),(2,3,'2025-04',NULL,'','',NULL,NULL,3,2,'Satisfactory','Danial perlu lebih tumpuan semasa kelas.','legacy',1,0,1,0,'2026-05-26 23:10:24'),(16,4,'2026-06','2026-06-11','Tadika Permata Intelek Ceria & Taska Rahiza','',4,'{\"1\":\"\\/\",\"3\":\"X\",\"5\":\"\\/\",\"8\":\"X\",\"11\":\"\\/\"}',3,3,'Satisfactory','Achieved: 3, Not achieved: 2','kpm',1,0,1,0,'2026-06-11 04:00:50'),(18,12,'2026-06','2026-06-11','Tadika Permata Intelek Ceria & Taska Rahiza','Test2',6,'{\"1\":\"\\/\",\"2\":\"X\",\"3\":\"\\/\",\"4\":\"X\",\"5\":\"\\/\",\"6\":\"X\",\"7\":\"\\/\",\"11\":\"\\/\",\"12\":\"X\",\"14\":\"\\/\",\"note_8\":\"test boleh ke tak\"}',3,3,'Satisfactory','Achieved: 6, Not achieved: 4','kpm',1,0,1,0,'2026-06-11 04:06:49'),(19,13,'2026-06','2026-06-11','Tadika Permata Intelek Ceria & Taska Rahiza','',5,'{\"1\":\"\\/\",\"2\":\"X\",\"3\":\"\\/\",\"5\":\"X\",\"7\":\"\\/\",\"9\":\"X\",\"11\":\"\\/\",\"note_6\":\"testetstetstetsetstetstetstetstetstettettsettstettetsettsets\",\"note_5\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_4\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_1\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_2\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_3\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_7\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_8\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_9\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_10\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_11\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_12\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_13\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\",\"note_14\":\"$error = \'\';\\n\\nif ($_SERVER[\'REQUEST_METHOD\'] === \'POST\') {\\n    $username = trim($_POST[\'username\'] ?? \'\');\\n    $password = $_POST[\'password\'] ?? \'\';\\n\\n    if ($username && $password) {\\n        $stmt = db()->prepare(\'SELECT id, full_name, password FROM users WHERE username = ? LIMIT 1\');\\n        $stmt->execute([$username]);\\n        $user = $stmt->fetch();\\n\"}',3,3,'Satisfactory','Achieved: 4, Not achieved: 3','kpm',1,0,1,0,'2026-06-11 04:37:48'),(20,34,'2026-06','2026-06-12','Tadika Permata Intelek Ceria & Taska Rahiza','umi',4,'{\"1\":\"\\/\",\"2\":\"X\",\"4\":\"\\/\",\"6\":\"X\",\"note_2\":\"\"}',3,3,'Satisfactory','Achieved: 2, Not achieved: 2','kpm',4,0,4,0,'2026-06-12 03:58:48'),(21,3,'2026-08','2026-08-19','Tadika Permata Intelek Ceria & Taska Rahiza','Administrator',5,'{\"1\":\"\\/\",\"2\":\"X\",\"4\":\"\\/\",\"5\":\"X\",\"7\":\"\\/\",\"9\":\"\\/\",\"10\":\"\\/\",\"note_6\":\"test123\"}',3,3,'Satisfactory','Achieved: 5, Not achieved: 2','kpm',1,0,1,0,'2026-08-19 13:18:10');
/*!40000 ALTER TABLE `dev_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Monthly Fee',
  `amount` decimal(8,2) NOT NULL,
  `month` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `date` date DEFAULT NULL,
  `status` enum('Paid','Unpaid','Overdue','Advance') COLLATE utf8mb4_unicode_ci DEFAULT 'Unpaid',
  `method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `ref` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `receipt` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,2,'Monthly Fee',150.00,'2025-05','2025-05-05','Paid','Cash','','RCP-2025-00001',NULL,'2026-05-26 23:10:24'),(2,3,'Registration Fee',200.00,'','2025-01-12','Paid','Bank Transfer','TXN001','RCP-2025-00002',NULL,'2026-05-26 23:10:24'),(3,5,'Monthly Fee',150.00,'2025-05','2025-05-12','Paid','Cash','','RCP-2025-00003',NULL,'2026-05-26 23:10:24'),(6,6,'Books',85.00,'','2025-03-01','Paid','Online','PAY002','RCP-2025-00004',NULL,'2026-05-26 23:10:24'),(7,2,'Monthly Fee',150.00,'2025-05','2025-05-05','Paid','Cash','','RCP-2025-00001',NULL,'2026-05-26 23:10:49'),(8,3,'Registration Fee',200.00,'','2025-01-12','Paid','Bank Transfer','TXN001','RCP-2025-00002',NULL,'2026-05-26 23:10:49'),(9,5,'Monthly Fee',150.00,'2025-05','2025-05-12','Paid','Cash','','RCP-2025-00003',NULL,'2026-05-26 23:10:49'),(12,6,'Books',85.00,'','2025-03-01','Paid','Online','PAY002','RCP-2025-00004',NULL,'2026-05-26 23:10:49'),(14,9,'Books',100.00,'2026-06','2026-06-10','Paid','Cash','','RCP-2026-00014','','2026-06-10 12:13:50'),(15,9,'Others',500.00,'2026-06','2026-04-20','Paid','Bank Transfer','','RCP-2026-00015','','2026-06-10 12:14:22'),(16,9,'Registration Fee',700.00,'2026-06','2026-11-12','Paid','QR DuitNow','','RCP-2026-00016','','2026-06-10 12:15:17'),(17,9,'Monthly Fee',1500.00,'2026-06','2026-06-10','Advance','Cash','','RCP-2026-00017','','2026-06-10 12:30:03'),(18,9,'Uniform',890.00,'','2026-10-16','Paid','QR DuitNow','','RCP-2026-00018','','2026-06-10 12:50:07'),(19,3,'Monthly Fee',150.00,'2026-06','2026-06-20','Advance','Cash','','RCP-2026-00019','','2026-06-10 13:06:02'),(20,9,'Monthly Fee',98000.00,'2026-06','2026-06-25','Advance','Cash','','RCP-2026-00020','','2026-06-10 13:25:16'),(21,4,'Monthly Fee',2550.00,'2025-01','2026-06-10','Paid','Cash','','RCP-2026-00021','','2026-06-10 14:16:14'),(22,11,'Monthly Fee',150.00,'2026-06','2026-06-10','Paid','Cash','','RCP-2026-00022','','2026-06-10 14:17:54'),(26,2,'Monthly Fee',150.00,'2025-01','2026-06-10','Paid','Cash','','RCP-2026-00026','','2026-06-10 14:39:31'),(27,2,'Monthly Fee',250.00,'2025-02','2026-06-10','Paid','Cash','','RCP-2026-00027','','2026-06-10 14:40:10'),(28,2,'Monthly Fee',2000.00,'2025-03','2026-06-10','Paid','Cash','','RCP-2026-00028','','2026-06-10 15:37:14'),(29,2,'Monthly Fee',150.00,'2026-05','2026-06-10','Paid','Cash','','RCP-2026-00029','','2026-06-10 15:40:48'),(30,6,'Monthly Fee',3200.00,'2025-02','2026-06-10','Paid','Cash','','RCP-2026-00030','','2026-06-10 15:41:58'),(31,13,'Monthly Fee',200.00,'2026-06','2026-06-10','Paid','Cash','','RCP-2026-00028','','2026-06-10 15:49:56'),(32,2,'Monthly Fee',150.00,'2025-05','2025-05-05','Paid','Cash','','RCP-2025-00001',NULL,'2026-06-10 16:26:49'),(33,3,'Registration Fee',200.00,'','2025-01-12','Paid','Bank Transfer','TXN001','RCP-2025-00002',NULL,'2026-06-10 16:26:49'),(34,5,'Monthly Fee',150.00,'2025-05','2025-05-12','Paid','Cash','','RCP-2025-00003',NULL,'2026-06-10 16:26:49'),(37,6,'Books',85.00,'','2025-03-01','Paid','Online','PAY002','RCP-2025-00004',NULL,'2026-06-10 16:26:49'),(38,2,'Monthly Fee',150.00,'2025-05','2025-05-05','Paid','Cash','','RCP-2025-00001',NULL,'2026-06-10 16:26:53'),(39,3,'Registration Fee',200.00,'','2025-01-12','Paid','Bank Transfer','TXN001','RCP-2025-00002',NULL,'2026-06-10 16:26:53'),(40,5,'Monthly Fee',150.00,'2025-05','2025-05-12','Paid','Cash','','RCP-2025-00003',NULL,'2026-06-10 16:26:53'),(43,6,'Books',85.00,'','2025-03-01','Paid','Online','PAY002','RCP-2025-00004',NULL,'2026-06-10 16:26:53'),(44,2,'Monthly Fee',150.00,'2025-05','2025-05-05','Paid','Cash','','RCP-2025-00001',NULL,'2026-06-10 16:27:16'),(45,3,'Registration Fee',200.00,'','2025-01-12','Paid','Bank Transfer','TXN001','RCP-2025-00002',NULL,'2026-06-10 16:27:16'),(46,5,'Monthly Fee',150.00,'2025-05','2025-05-12','Paid','Cash','','RCP-2025-00003',NULL,'2026-06-10 16:27:16'),(49,6,'Books',85.00,'','2025-03-01','Paid','Online','PAY002','RCP-2025-00004',NULL,'2026-06-10 16:27:16'),(50,2,'Monthly Fee',150.00,'2025-05','2025-05-05','Paid','Cash','','RCP-2025-00001',NULL,'2026-06-10 16:27:31'),(51,3,'Registration Fee',200.00,'','2025-01-12','Paid','Bank Transfer','TXN001','RCP-2025-00002',NULL,'2026-06-10 16:27:31'),(52,5,'Monthly Fee',150.00,'2025-05','2025-05-12','Paid','Cash','','RCP-2025-00003',NULL,'2026-06-10 16:27:31'),(55,6,'Books',85.00,'','2025-03-01','Paid','Online','PAY002','RCP-2025-00004',NULL,'2026-06-10 16:27:31'),(56,33,'Monthly Fee',150.00,'2026-06','2026-06-10','Paid','Cash','','RCP-2026-00051','','2026-06-10 16:43:52'),(57,3,'Monthly Fee',2550.00,'2025-01','2026-06-10','Advance','Cash','','RCP-2026-00052','','2026-06-10 17:17:24'),(58,12,'Monthly Fee',340.00,'2026-06','2026-06-11','Paid','Cash','','RCP-2026-00053','','2026-06-11 04:12:40'),(59,34,'Registration Fee',50.00,'','2026-06-12','Paid','Cash','12345678','RCP-2026-00050','','2026-06-12 02:12:33'),(60,34,'Monthly Fee',230.00,'2026-06','2026-06-12','Paid','Cash','12345678','RCP-2026-00050','','2026-06-12 02:12:33'),(61,5,'Monthly Fee',100.00,'2025-02','2026-06-12','Paid','Cash','','RCP-2026-00052','','2026-06-12 02:38:59'),(62,3,'Monthly Fee',300.00,'2026-07','2026-08-12','Advance','Cash','','RCP-2026-00051','','2026-08-12 16:59:13'),(64,4,'Monthly Fee',300.00,'2026-06','2026-08-19','Advance','Cash','','RCP-2026-00053','','2026-08-19 13:11:35'),(65,33,'Monthly Fee',300.00,'2026-07','2026-08-19','Advance','Cash','','RCP-2026-00048','','2026-08-19 13:16:20'),(67,2,'Monthly Fee',2100.00,'2025-04','2026-08-25','Advance','Cash','','RCP-2026-00049','','2026-08-25 13:59:45'),(68,2,'Monthly Fee',210.00,'2025-06','2026-09-02','Advance','QR DuitNow','','RCP-2026-00050','','2026-09-02 11:06:16');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reading_progress_records`
--

DROP TABLE IF EXISTS `reading_progress_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reading_progress_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `quarter` varchar(12) NOT NULL,
  `record_date` date NOT NULL,
  `has_bm` tinyint(1) NOT NULL DEFAULT '1',
  `has_bi` tinyint(1) NOT NULL DEFAULT '1',
  `bm_book_level` tinyint(1) NOT NULL DEFAULT '1',
  `bm_page` int NOT NULL DEFAULT '0',
  `bi_book_level` tinyint(1) NOT NULL DEFAULT '1',
  `bi_page` int NOT NULL DEFAULT '0',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_quarter` (`student_id`,`quarter`),
  KEY `idx_record_date` (`record_date`),
  CONSTRAINT `fk_reading_progress_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reading_progress_records`
--

LOCK TABLES `reading_progress_records` WRITE;
/*!40000 ALTER TABLE `reading_progress_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `reading_progress_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(180) NOT NULL DEFAULT '',
  `permissions_json` longtext NOT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=268 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrator','Full access to all KinderVault features and security records.','[\"*\"]',1,'2026-08-25 13:51:03','2026-08-25 13:51:03'),(2,'Teacher','Student viewing and student development work by default.','[\"dashboard.view\",\"students.view\",\"development.view\",\"development.create\",\"development.update\",\"search.use\"]',1,'2026-08-25 13:51:03','2026-08-25 13:51:03'),(3,'Authorized Staff','A restricted role that an administrator can configure.','[\"dashboard.view\",\"search.use\"]',1,'2026-08-25 13:51:03','2026-08-25 13:51:03');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ic` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `birth_cert` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `gender` char(1) COLLATE utf8mb4_unicode_ci DEFAULT 'M',
  `dob` date DEFAULT NULL,
  `child_position` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `program_age` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `monthly_package` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'A',
  `wants_uniform` tinyint(1) DEFAULT '1',
  `wants_sports_uniform` tinyint(1) DEFAULT '1',
  `wants_tudung` tinyint(1) DEFAULT '1',
  `wants_iqra` tinyint(1) DEFAULT '0',
  `class` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `parent` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `address` text COLLATE utf8mb4_unicode_ci,
  `father_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `father_ic` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `father_address` text COLLATE utf8mb4_unicode_ci,
  `father_job` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `father_employer` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `father_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `mother_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `mother_ic` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `mother_address` text COLLATE utf8mb4_unicode_ci,
  `mother_job` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `mother_employer` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `mother_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `fee` decimal(8,2) DEFAULT '150.00',
  `status` enum('Active','Inactive','Graduated') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `enrol` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (2,'STU-2025-002','Nur Aliya binti Amirah','130215-14-6032','','F','2013-02-15','','','A',1,1,1,0,'Permata','Amirah binti Zain','013-2345678',NULL,'','',NULL,'','','','','',NULL,'','','',150.00,'Active','2025-01-10','2026-05-26 23:10:24'),(3,'STU-2025-003','Danial Haziq bin Hafiz','121130-14-7043','','M','2012-11-30','','','A',1,1,1,0,'Intelek','Hafiz bin Othman','011-3456780',NULL,'','',NULL,'','','','','',NULL,'','','',150.00,'Active','2025-01-12','2026-05-26 23:10:24'),(4,'STU-2025-004','Siti Aisyah binti Razali','130401-14-8054','','F','2013-04-01','','','A',1,1,1,0,'Permata','Razali bin Yusuf','014-5678901',NULL,'','',NULL,'','','','','',NULL,'','','',150.00,'Active','2025-01-15','2026-05-26 23:10:24'),(5,'STU-2025-005','Irfan Hakimi bin Nordin','121222-14-9065','','M','2012-12-22','','','A',1,1,1,0,'Intelek','Nordin bin Ismail','016-7890123',NULL,'','',NULL,'','','','','',NULL,'','','',150.00,'Active','2025-02-03','2026-05-26 23:10:24'),(6,'STU-2025-006','Nurul Hana binti Rashid','131005-14-1076','','F','2013-10-05','','','A',1,1,1,0,'Taska','Rashid bin Kamal','017-9012345',NULL,'','',NULL,'','','','','',NULL,'','','',200.00,'Active','2025-02-10','2026-05-26 23:10:24'),(9,'STU-2026-007','haikal','154544645','','M','2026-06-18','','','A',1,1,1,0,'Intelek','mustafhha','0137233743','rembau','','',NULL,'','','','','',NULL,'','','',1500.00,'Active','2026-06-10','2026-06-10 10:59:32'),(11,'STU-2026-009','testje','','','M','2026-06-04','','','A',1,1,1,0,'Intelek','test1','013254578','jwdijid','','',NULL,'','','','','',NULL,'','','',150.00,'Active','2026-06-09','2026-06-10 13:53:00'),(12,'STU-2026-010','test2','342132567','','M','2026-06-03','','','A',1,1,1,0,'Ceria','frrfr','','frfr','','',NULL,'','','','','',NULL,'','','',340.00,'Active','2026-06-10','2026-06-10 14:00:21'),(13,'STU-2026-011','test3','xwcdw','','M','2026-06-08','','','A',1,1,1,0,'Intelek','test3','','','','',NULL,'','','','','',NULL,'','','',200.00,'Active','2026-05-10','2026-06-10 15:49:44'),(33,'STU-2026-012','dannyiel','tydvwd','','M','2026-06-04','','','A',1,1,1,0,'Intelek','danny','0 13-669 8677','','','',NULL,'','','','','',NULL,'','','',150.00,'Active','2026-06-10','2026-06-10 16:41:12'),(34,'STU-2026-013','testumi','566464545','','F','2026-06-24','','','A',1,1,1,0,'Permata','umi','0172247678','','','',NULL,'','','','','',NULL,'','','',230.00,'Active','2026-06-12','2026-06-12 02:07:03');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permission_overrides`
--

DROP TABLE IF EXISTS `user_permission_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permission_overrides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission` varchar(100) NOT NULL,
  `granted` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_permission` (`user_id`,`permission`),
  KEY `idx_permission_user` (`permission`,`user_id`),
  CONSTRAINT `fk_user_permission_override_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permission_overrides`
--

LOCK TABLES `user_permission_overrides` WRITE;
/*!40000 ALTER TABLE `user_permission_overrides` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_permission_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Authorized Staff',
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active',
  `language` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `last_login_at` datetime DEFAULT NULL,
  `failed_login_count` int unsigned NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `mfa_secret_encrypted` text COLLATE utf8mb4_unicode_ci,
  `mfa_recovery_codes_json` longtext COLLATE utf8mb4_unicode_ci,
  `mfa_confirmed_at` datetime DEFAULT NULL,
  `mfa_last_used_counter` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','Administrator','$2y$12$FPN6H53nDaviRQHlRDk0gu4DZCfEQEw5FZ.6ZOSXxobhMk.vFvOZ2','Administrator','Active','en','2026-09-02 11:04:59',0,NULL,0,NULL,NULL,NULL,NULL,'2026-08-25 13:51:03','2026-09-02 11:04:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kindervault'
--

--
-- Dumping routines for database 'kindervault'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-02 19:17:30
