<?php

return [
    'POST /register.php' => 'AuthController@register',
    'POST /login.php' => 'AuthController@login',
    'POST /logout.php' => 'AuthController@logout',
    'GET /products.php' => 'ProductController@index',
    'POST /products.php' => 'ProductController@store',
    'PUT /products.php?id={id}' => 'ProductController@update',
    'DELETE /products.php?id={id}' => 'ProductController@destroy',
    'GET /cart.php' => 'CartController@show',
    'POST /cart.php' => 'CartController@add',
    'PUT /cart.php' => 'CartController@update',
    'DELETE /cart.php' => 'CartController@remove',
    'GET /orders.php' => 'OrderController@index',
    'POST /orders.php' => 'OrderController@store',
    'GET /ai.php?session_id={session_id}' => 'AiController@chat',
    'WS ws://127.0.0.1:8765/ws' => 'Gemini Live shopping assistant',
];
