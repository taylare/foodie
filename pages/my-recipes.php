<?php 
include '../includes/header.php'; 

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}
?>

<div class="d-flex align-items-center justify-content-between flex-wrap flex-md-nowrap mb-4" style="gap: 20px;">
  <h2 class="mb-0">
    My Recipes | <a href="add-recipe.php">Add Your Own Recipe</a>
  </h2>
  
  <form method="GET" class="mb-0" style="flex-shrink: 1;">
    <input type="text" name="search" class="form-control" placeholder="Search your recipes..."
      value="<?php echo isset($_GET['search']) ? htmlspecialchars($_GET['search']) : ''; ?>"
      style="max-width: 250px;">
  </form>
</div>

<?php
include '../includes/db.php';
$user_id = $_SESSION['user_id'];

// Get search keyword
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

// Prepare SQL with LIKE if searching
if ($search !== '') {
    $stmt = $conn->prepare("SELECT * FROM recipes WHERE user_id = ? AND (title LIKE ? OR ingredients LIKE ?)");
    $like = '%' . $search . '%';
    $stmt->bind_param("iss", $user_id, $like, $like);
} else {
    $stmt = $conn->prepare("SELECT * FROM recipes WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
}

$stmt->execute();
$result = $stmt->get_result();

// Show matching recipes
if ($result->num_rows > 0) {
    echo '<div class="recipe-grid">';
    while ($recipe = $result->fetch_assoc()) {
        include '../templates/recipe-card.php';
    }
    echo '</div>';
} else {
    echo '<p>No recipes found.</p>';
}
?>
