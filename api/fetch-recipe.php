<?php
include "../includes/db.php";
// fetch_recipe.php
header('Content-Type: application/json');

$apiKey = $spoonacularApiKey;  

if (!isset($_GET['url']) || empty($_GET['url'])) {
    echo json_encode(['error' => 'Missing recipe URL']);
    exit;
}

$url = urlencode($_GET['url']);

// Call Spoonacular's Extract API
$apiEndpoint = "https://api.spoonacular.com/recipes/extract?url={$url}&apiKey={$apiKey}";

$response = file_get_contents($apiEndpoint);

if ($response === FALSE) {
    echo json_encode(['error' => 'Failed to reach Spoonacular API']);
    exit;
}

$data = json_decode($response, true);

// Check for required fields
if (!isset($data['title']) || !isset($data['extendedIngredients']) || !isset($data['instructions'])) {
    echo json_encode(['error' => 'Recipe information could not be extracted.']);
    exit;
}

// Prepare response
$title = $data['title'];
$ingredients = array_map(function ($item) {
    return $item['original'];
}, $data['extendedIngredients']);

$instructions = strip_tags($data['instructions']); // Remove HTML if any

echo json_encode([
    'title' => $title,
    'ingredients' => $ingredients,
    'instructions' => $instructions
]);
?>
