<?php
session_start();
include '../includes/db.php';

$user_id = $_SESSION['user_id'];
$result = $conn->query("SELECT * FROM recipes WHERE user_id = $user_id");

$recipes = [];
while ($row = $result->fetch_assoc()) {
    $recipes[] = $row;
}
header('Content-Type: application/json');
echo json_encode($recipes);
?>