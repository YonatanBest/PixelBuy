<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Models\Category;
use App\Models\Product;

class ProductController
{
    public function handle(): void
    {
        match (Request::method()) {
            'GET' => $this->index(),
            'POST' => $this->store(),
            'PUT' => $this->update(),
            'DELETE' => $this->destroy(),
            default => Response::json(['success' => false, 'message' => 'Method not allowed.'], 405),
        };
    }

    public function index(): void
    {
        $products = new Product();

        if (isset($_GET['id'])) {
            $product = $products->find((int) $_GET['id']);
            if (!$product) {
                Response::json(['success' => false, 'message' => 'Product not found.'], 404);
            }
            Response::json(['success' => true, 'data' => $product]);
        }

        Response::json([
            'success' => true,
            'data' => $products->all($_GET['search'] ?? null, isset($_GET['category_id']) ? (int) $_GET['category_id'] : null),
            'categories' => (new Category())->all(),
        ]);
    }

    public function store(): void
    {
        Auth::requireAdmin();
        $data = Request::input();
        if (empty($data['name']) || empty($data['price'])) {
            Response::json(['success' => false, 'message' => 'Product name and price are required.'], 422);
        }

        $product = (new Product())->create($data);
        Response::json(['success' => true, 'message' => 'Product created.', 'data' => $product], 201);
    }

    public function update(): void
    {
        Auth::requireAdmin();
        $id = (int) ($_GET['id'] ?? 0);
        $product = (new Product())->update($id, Request::input());
        if (!$product) {
            Response::json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        Response::json(['success' => true, 'message' => 'Product updated.', 'data' => $product]);
    }

    public function destroy(): void
    {
        Auth::requireAdmin();
        $id = (int) ($_GET['id'] ?? 0);
        (new Product())->delete($id);

        Response::json(['success' => true, 'message' => 'Product deleted.']);
    }
}

