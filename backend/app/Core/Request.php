<?php

namespace App\Core;

class Request
{
    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function input(): array
    {
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);

        if (is_array($json)) {
            return array_merge($_POST, $json);
        }

        if (self::method() === 'PUT' || self::method() === 'DELETE') {
            parse_str($raw, $data);
            return array_merge($_POST, $data);
        }

        return $_POST;
    }
}

