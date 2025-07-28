<?php include '../includes/header.php'; 

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}
?>
<h2>My Recipes</h2>
<?php
include '../includes/db.php';
$user_id = $_SESSION['user_id'];
$result = $conn->query("SELECT * FROM recipes WHERE user_id = $user_id");

while ($recipe = $result->fetch_assoc()) {
    include '../templates/recipe-card.php';
}
?>
<?php include '../includes/footer.php'; ?>
