<div class="recipe-card">
    <img src="<?= $recipe['image_url'] ?>" alt="<?= htmlspecialchars($recipe['title']) ?>">
    <h3><?= htmlspecialchars($recipe['title']) ?></h3>
    <p><strong>Ingredients:</strong><br><?= nl2br(htmlspecialchars($recipe['ingredients'])) ?></p>
    <p><strong>Instructions:</strong><br><?= nl2br(htmlspecialchars($recipe['instructions'])) ?></p>
</div>
