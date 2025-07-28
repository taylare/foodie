<?php
$query = $_GET['q'] ?? '';
$apiKey = 'YOUR_API_KEY';
$url = "https://api.spoonacular.com/recipes/complexSearch?query=" . urlencode($query) . "&apiKey=" . $apiKey;

$response = file_get_contents($url);
header('Content-Type: application/json');
echo $response;
?>