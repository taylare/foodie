<?php
include '../includes/header.php';
include '../includes/db.php';

// Redirect if no ID provided
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    echo "<p class='text-danger text-center'>Invalid recipe ID.</p>";
    exit;
}

$recipe_id = $_GET['id'];
$stmt = $conn->prepare("SELECT * FROM recipes WHERE id = ?");
$stmt->bind_param("i", $recipe_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo "<p class='text-danger text-center'>Recipe not found.</p>";
    exit;
}

$recipe = $result->fetch_assoc();
?>

<main class="d-flex justify-content-center align-items-start my-5">
  <div class="full-recipe-card recipe-card">
         <?php if (!empty($recipe['image_url'])): ?>
        <img src="<?= htmlspecialchars($recipe['image_url']) ?>" alt="<?= htmlspecialchars($recipe['title']) ?>" class="recipe-img">
        <?php else: ?>
        <img src="../assets/images/empty-img.png" alt="No image" class="recipe-img">
    <?php endif; ?>

      
      <h2 style="text-decoration: underline;"><?= htmlspecialchars($recipe['title']) ?></h2>

      <p><strong>Ingredients:</strong></p>
      <ul>
          <?php foreach (explode("\n", $recipe['ingredients']) as $ingredient): ?>
              <li class="text-start"><?= htmlspecialchars(trim($ingredient)) ?></li>
          <?php endforeach; ?>
      </ul>

      <p><strong>Instructions:</strong></p>
      <p class="text-start"><?= nl2br(htmlspecialchars($recipe['instructions'])) ?></p>

      <p><strong>Serves: <?= $recipe['servings'] ?> people.</strong></p>

      <a href="javascript:history.back()" class="btn btn-pink mt-3">🔙 Back</a>
  </div>
</main>

<?php include "../includes/footer.php" ?>

