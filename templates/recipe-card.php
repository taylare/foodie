<div class="recipe-card">
    <?php if (!empty($recipe['image_url'])): ?>
        <img src="<?= htmlspecialchars($recipe['image_url']) ?>" alt="<?= htmlspecialchars($recipe['title']) ?>" class="recipe-img">
        <?php else: ?>
        <img src="../assets/images/empty-img.png" alt="No image" class="recipe-img">
    <?php endif; ?>

        <h3><?= htmlspecialchars($recipe['title']) ?></h3>

            <p><a class="view-recipe-link" href="view-recipe.php?id=<?= $recipe['id'] ?>">View Recipe</a></p>
        </p>
</div>

