<?php

require_once __DIR__ . '/../config.php';

// ── Scanner availability guard ─────────────────────────────
// When SCANNER_ENABLED=false (Render deployment), reject all requests before
// loading any scanner class, starting Ollama, or running Tesseract.
if (!SCANNER_ENABLED) {
    jsonResponse([
        'error'   => 'The registration form scanner is not available in this environment.',
        'code'    => 'SCANNER_DISABLED',
    ], 503);
}

require_once __DIR__ . '/../scanner/RegistrationFormScanner.php';
require_once __DIR__ . '/../scanner/LocalVisionRegistrationExtractor.php';

requireLogin();
requirePermission('students.create');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}
requireCsrfToken();

$action = (string)($_GET['action'] ?? 'scan');
if ($action === 'prefill') {
    auditLog('STUDENT_FORM_PREFILLED', 'Student Management', 'Registration Form Scan', 'temporary', 'Reviewed scanner values were transferred to the existing Add Student form.', 'Success');
    jsonResponse(['success' => true]);
}
if ($action !== 'scan') {
    jsonResponse(['error' => 'Unsupported scanner action.'], 400);
}

const SCANNER_MAX_BYTES = 10 * 1024 * 1024;
const SCANNER_MAX_PIXELS = 30000000;

$upload = $_FILES['form_image'] ?? null;
if (!$upload || !is_array($upload)) {
    jsonResponse(['error' => 'Please choose a registration form image.'], 422);
}
$uploadError = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
if ($uploadError !== UPLOAD_ERR_OK) {
    $maxUpload = ini_get('upload_max_filesize') ?: '10M';
    $errorMsg = match ($uploadError) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "The uploaded image exceeds the server upload limit ({$maxUpload}).",
        UPLOAD_ERR_PARTIAL => 'The image was only partially uploaded. Please try again.',
        UPLOAD_ERR_NO_FILE => 'Please choose a registration form image.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder on the server.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write image to disk on the server.',
        default => 'The registration form image could not be uploaded (error code ' . $uploadError . ').',
    };
    jsonResponse(['error' => $errorMsg], 422);
}
if ((int)($upload['size'] ?? 0) <= 0 || (int)$upload['size'] > SCANNER_MAX_BYTES) {
    jsonResponse(['error' => 'The image must be 10 MB or smaller.'], 422);
}

$originalName = (string)($upload['name'] ?? '');
$extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$allowed = [
    'image/jpeg' => ['jpg', 'jpeg'],
    'image/png' => ['png'],
];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = (string)$finfo->file((string)$upload['tmp_name']);
if (!isset($allowed[$mimeType]) || !in_array($extension, $allowed[$mimeType], true)) {
    jsonResponse(['error' => 'Only valid JPG, JPEG, and PNG images are accepted.'], 422);
}

$dimensions = @getimagesize((string)$upload['tmp_name']);
if (!$dimensions || ($dimensions[0] * $dimensions[1]) > SCANNER_MAX_PIXELS) {
    jsonResponse(['error' => 'The image dimensions are invalid or too large.'], 422);
}

$temporaryDirectory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'kindervault-scanner';
if (!is_dir($temporaryDirectory) && !mkdir($temporaryDirectory, 0700, true) && !is_dir($temporaryDirectory)) {
    jsonResponse(['error' => 'A secure temporary workspace could not be created.'], 500);
}

foreach (glob($temporaryDirectory . DIRECTORY_SEPARATOR . 'scan-*') ?: [] as $stalePath) {
    if (is_file($stalePath) && filemtime($stalePath) < time() - 7200) {
        @unlink($stalePath);
    }
}
foreach (['kv-scan-processed-*', 'kv-scan-region-*'] as $temporaryPattern) {
    foreach (glob(rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $temporaryPattern) ?: [] as $stalePath) {
        if (is_file($stalePath) && filemtime($stalePath) < time() - 7200) {
            @unlink($stalePath);
        }
    }
}

$safeExtension = $mimeType === 'image/png' ? 'png' : 'jpg';
$temporaryPath = $temporaryDirectory . DIRECTORY_SEPARATOR . 'scan-' . bin2hex(random_bytes(16)) . '.' . $safeExtension;
if (!move_uploaded_file((string)$upload['tmp_name'], $temporaryPath)) {
    jsonResponse(['error' => 'The registration form image could not be secured for processing.'], 500);
}

$startedAt = microtime(true);
auditLog('FORM_SCAN_STARTED', 'Student Management', 'Registration Form Scan', 'temporary', 'Started local processing of a physical registration form.', 'Success', [
    'mime_type' => $mimeType,
    'file_size_bytes' => (int)$upload['size'],
    'image_width' => (int)$dimensions[0],
    'image_height' => (int)$dimensions[1],
]);

try {
    $result = RegistrationFormScanner::scan($temporaryPath, $mimeType);
    $visionUsed = false;
    $visionSuccess = false;
    $visionAvailability = LocalVisionRegistrationExtractor::availability();
    $result['vision'] = $visionAvailability + ['status' => $visionAvailability['available'] ? 'ready' : 'unavailable'];
    if (($result['template']['recognized'] ?? false) && $visionAvailability['available']) {
        $visionUsed = true;
        try {
            $vision = LocalVisionRegistrationExtractor::extract($temporaryPath, $mimeType);
            $result['extraction'] = $vision['data'];
            $result['vision'] = [
                'available' => true,
                'status' => 'completed',
                'engine' => $vision['engine'],
                'model' => $vision['model'],
                'timing_ms' => $vision['timing_ms'],
                'raw_by_region' => $vision['raw_by_region'],
            ];
            $visionSuccess = true;
        } catch (Throwable) {
            $result['vision']['status'] = 'failed';
            $result['vision']['error'] = 'Local handwriting extraction could not be completed. Review the OCR output or use manual registration.';
        }
    }
    $actor = currentUser();
    if (($actor['role'] ?? '') !== 'Administrator') {
        unset($result['raw_ocr']);
        unset($result['vision']['raw_by_region']);
    }
    auditLog('FORM_SCAN_PROCESSED', 'Student Management', 'Registration Form Scan', 'temporary', 'Completed local OCR processing of a physical registration form.', 'Success', [
        'template_recognized' => (bool)($result['template']['recognized'] ?? false),
        'text_detected' => (bool)($result['text_detected'] ?? false),
        'local_vision_used' => $visionUsed,
        'local_vision_success' => $visionSuccess,
        'processing_time_ms' => (int)round((microtime(true) - $startedAt) * 1000),
    ]);
    jsonResponse($result);
} catch (Throwable $error) {
    auditLog('FORM_SCAN_PROCESSED', 'Student Management', 'Registration Form Scan', 'temporary', 'Local OCR processing of a physical registration form failed.', 'Failed', [
        'processing_time_ms' => (int)round((microtime(true) - $startedAt) * 1000),
    ]);
    // Scanner command paths and local model details must never be exposed in
    // production responses. Keep the useful diagnostic only for local debug.
    $message = APP_DEBUG
        ? $error->getMessage()
        : 'The registration form could not be processed. Please try again or use manual registration.';
    jsonResponse(['error' => $message], 500);
} finally {
    if (is_file($temporaryPath)) {
        @unlink($temporaryPath);
    }
}
