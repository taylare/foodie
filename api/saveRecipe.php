<?php
session_start();
include '../includes/db.php';

if (!isset($_SESSION['user_id'])) {
    die("Unauthorized");
}

$title = $_POST['title'];
$ingredients = $_POST['ingredients'];
$instructions = $_POST['instructions'];
$image_url = $_POST['image_url'];
$category = $_POST['category'];
$user_id = $_SESSION['user_id'];

// Use default image if none provided
if (empty($image_url)) {
    $image_url = '../assets/images/empty-img.png';
}

$stmt = $conn->prepare("INSERT INTO recipes (user_id, title, ingredients, instructions, image_url, category) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isssss", $user_id, $title, $ingredients, $instructions, $image_url, $category);
$stmt->execute();

header("Location: ../pages/my-recipes.php");
exit;
?>
