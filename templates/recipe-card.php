<div class="recipe-card">
    <img src="<?= $recipe['image_url'] ?>" alt="<?= htmlspecialchars($recipe['title']) ?>">
    <h3><?= htmlspecialchars($recipe['title']) ?></h3>
    <p><?= nl2br(htmlspecialchars($recipe['ingredients'])) ?></p>
</div>