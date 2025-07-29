<?php
include '../includes/header.php';
include '../includes/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];

// Get this week's date range (Monday to Sunday)
$today = new DateTime();
$monday = (clone $today)->modify('monday this week')->format('Y-m-d');
$sunday = (clone $today)->modify('sunday this week')->format('Y-m-d');

// Step 1: Get all recipe IDs in the user's meal plan this week
$stmt = $conn->prepare("
    SELECT DISTINCT recipe_id 
    FROM meal_plan 
    WHERE user_id = ? 
    AND date BETWEEN ? AND ?
    AND recipe_id IS NOT NULL
");
$stmt->bind_param("iss", $user_id, $monday, $sunday);
$stmt->execute();
$result = $stmt->get_result();

$recipeIds = [];
while ($row = $result->fetch_assoc()) {
    $recipeIds[] = $row['recipe_id'];
}

$ingredientsList = [];

if (!empty($recipeIds)) {
    // Step 2: Fetch recipes and extract ingredients from TEXT field
    $placeholders = implode(',', array_fill(0, count($recipeIds), '?'));
    $types = str_repeat('i', count($recipeIds));
    $sql = "SELECT ingredients FROM recipes WHERE id IN ($placeholders)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$recipeIds);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $raw = $row['ingredients'];

        // Try splitting by newline or comma
        $lines = preg_split("/\r\n|\n|\r|,/", $raw);

        foreach ($lines as $item) {
            $item = trim($item);
            if ($item !== '') {
                $normalized = strtolower($item);
                if (isset($ingredientsList[$normalized])) {
                    $ingredientsList[$normalized]++;
                } else {
                    $ingredientsList[$normalized] = 1;
                }
            }
        }
    }
}
?>

<h2>Shopping List</h2>

<?php if (empty($recipeIds)): ?>
    <p>No meals planned for this week yet. Your shopping list will appear here once you plan some meals!</p>
<?php else: ?>
    <p>Based on your current meal plan for this week, here’s a combined list of ingredients:</p>
    <ul id="shopping-list">
        <?php foreach ($ingredientsList as $ingredient => $count): ?>
            <li class="shopping-item" style="cursor: pointer;">
                <?php echo htmlspecialchars(ucfirst($ingredient)); ?>
                <?php if ($count > 1): ?>
                    (x<?php echo $count; ?>)
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
<?php endif; ?>

<!-- Tap-to-cross-out script -->
<script>
document.addEventListener("DOMContentLoaded", function () {
    const items = document.querySelectorAll("#shopping-list .shopping-item");
    items.forEach(item => {
        item.addEventListener("click", function () {
            this.classList.toggle("crossed-off");
        });
    });
});
</script>

<!-- Crossed-out style -->
<style>
.crossed-off {
    text-decoration: line-through;
    opacity: 0.6;
}
</style>

<?php include '../includes/footer.php'; ?>
