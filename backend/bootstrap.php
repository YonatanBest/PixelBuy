<?php

use App\Core\Env;

spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/app/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($path)) {
        require_once $path;
    }
});

Env::load(__DIR__ . '/.env');

$isHttps = (
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
);

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => Env::get('SESSION_COOKIE_DOMAIN', ''),
    'secure' => filter_var(Env::get('SESSION_COOKIE_SECURE', $isHttps ? 'true' : 'false'), FILTER_VALIDATE_BOOL),
    'httponly' => true,
    'samesite' => Env::get('SESSION_COOKIE_SAMESITE', 'Lax'),
]);

session_start();

set_exception_handler(function (Throwable $error): void {
    App\Core\Response::json([
        'success' => false,
        'message' => 'Server error: ' . $error->getMessage(),
    ], 500);
});

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = array_filter(array_map('trim', explode(',', (string) Env::get('CORS_ALLOWED_ORIGINS', ''))));
$allowOrigin = '*';

if ($origin !== '') {
    $allowOrigin = empty($allowedOrigins) || in_array($origin, $allowedOrigins, true) ? $origin : '';
} elseif (!empty($allowedOrigins)) {
    $allowOrigin = $allowedOrigins[0];
}

if ($allowOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowOrigin);
}
header('Vary: Origin');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Credentials: true');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
