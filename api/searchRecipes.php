<?php
$query = $_GET['q'] ?? '';
$apiKey = '8f88d2bd5ab6413ba6177781765f7576';
$url = "https://api.spoonacular.com/recipes/complexSearch?query=" . urlencode($query) . "&apiKey=" . $apiKey;

$response = file_get_contents($url);
header('Content-Type: application/json');
echo $response;
?>