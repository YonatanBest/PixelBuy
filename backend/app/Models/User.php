<?php

namespace App\Models;

class User extends BaseModel
{
    public function create(string $name, string $email, string $password, string $role = 'user'): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $role]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function safe(array $user): array
    {
        unset($user['password']);
        return $user;
    }
}

