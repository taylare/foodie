<?php
session_start();
include '../includes/db.php';

if (!isset($_SESSION['user_id'])) {
    die("Unauthorized");
}

$title = $_POST['title'];
$ingredients = $_POST['ingredients'];
$instructions = $_POST['instructions'];
$category = $_POST['category'];
$user_id = $_SESSION['user_id'];
$image_url = $_POST['image_url'] ?? '';

// 1. Handle uploaded file
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = '../assets/images/uploads/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);

    $tmp_name = $_FILES['image']['tmp_name'];
    $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $filename = uniqid('recipe_', true) . "." . $ext;
    $target_path = $upload_dir . $filename;

    move_uploaded_file($tmp_name, $target_path);
    $image_url = $target_path;
}

// 2. If no image provided, use default
if (empty($image_url)) {
    $image_url = '../assets/images/empty-img.png';
}

$stmt = $conn->prepare("INSERT INTO recipes (user_id, title, ingredients, instructions, image_url, category) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isssss", $user_id, $title, $ingredients, $instructions, $image_url, $category);
$stmt->execute();

header("Location: ../pages/my-recipes.php");
exit;
?>
