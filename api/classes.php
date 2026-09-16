<?php
// ============================================================
// api/classes.php  –  CRUD for classes
// GET    /api/classes.php           → list all classes
// POST   /api/classes.php           → create new class
// PUT    /api/classes.php?id=N      → update class
// DELETE /api/classes.php?id=N      → delete class
// ============================================================
require_once __DIR__ . '/../config.php';
requireLogin();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        requirePermission('classes.view');
        $rows = db()->query('SELECT * FROM classes ORDER BY name')->fetchAll();
        jsonResponse($rows);

    case 'POST':
        jsonResponse(['error' => 'Class structure is fixed: Permata, Intelek, Ceria.'], 405);

    case 'PUT':
        jsonResponse(['error' => 'Class structure is fixed: Permata, Intelek, Ceria.'], 405);

    case 'DELETE':
        jsonResponse(['error' => 'Class structure is fixed: Permata, Intelek, Ceria.'], 405);

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
