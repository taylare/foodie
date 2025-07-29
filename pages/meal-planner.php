<?php
include '../includes/header.php';
include '../includes/db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];

// Handle form submission

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['reset_meal_plan'])) {
    $deleteStmt = $conn->prepare("DELETE FROM meal_plan WHERE user_id = ?");
    $deleteStmt->bind_param("i", $user_id);
    $deleteStmt->execute();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($_POST['meal'] as $date => $mealsForDay) {
        foreach ($mealsForDay as $meal_type => $recipe_id) {
            if (!empty($recipe_id)) {
                // Use REPLACE INTO to insert/update
                $stmt = $conn->prepare("REPLACE INTO meal_plan (user_id, date, meal_type, recipe_id) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("issi", $user_id, $date, $meal_type, $recipe_id);
                $stmt->execute();
            }
        }
    }
}

// Fetch user recipes
$recipes = [];
$res = $conn->prepare("SELECT id, title FROM recipes WHERE user_id = ?");
$res->bind_param("i", $user_id);
$res->execute();
$result = $res->get_result();
while ($row = $result->fetch_assoc()) {
    $recipes[] = $row;
}

// Fetch saved meal plan
$saved = [];
$planQuery = $conn->prepare("SELECT * FROM meal_plan WHERE user_id = ?");
$planQuery->bind_param("i", $user_id);
$planQuery->execute();
$planResult = $planQuery->get_result();
while ($row = $planResult->fetch_assoc()) {
    $saved[$row['date']][$row['meal_type']] = $row['recipe_id'];
}

// Days and meals
$days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
$meals = ["breakfast", "lunch", "dinner"];

$today = new DateTime();
$monday = (clone $today)->modify('monday this week');
?>

<h2 class="text-primary">Meal Planner</h2>

<form method="POST">
    <?php foreach ($days as $i => $day): 
        $date = (clone $monday)->modify("+$i days")->format('Y-m-d');
    ?>
        <div class="mb-4">
            <h4 class="fw-bold"><?php echo $day; ?></h4>
            <div class="row">
                <?php foreach ($meals as $meal): ?>
                    <div class="col-md-4">
                        <select name="meal[<?php echo $date; ?>][<?php echo $meal; ?>]" class="form-select mb-2">
                            <option value="">-- <?php echo $meal; ?> --</option>
                            <?php foreach ($recipes as $recipe): ?>
                                <option value="<?php echo $recipe['id']; ?>"
                                    <?php echo (isset($saved[$date][$meal]) && $saved[$date][$meal] == $recipe['id']) ? 'selected' : ''; ?>>
                                    <?php echo htmlspecialchars($recipe['title']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endforeach; ?>

    <button type="submit" class="btn btn-pink mt-3">Save Meal Plan</button>
    <button type="submit" name="reset_meal_plan" value="1" class="btn btn-outline-danger mt-3 ms-3">Reset Meal Plan</button>
</form>

<?php
$hasData = false;
foreach ($saved as $date => $mealsForDay) {
    foreach ($mealsForDay as $mealType => $recipeId) {
        if (!empty($recipeId)) {
            $hasData = true;
            break 2; // stop both loops
        }
    }
}
?>

<?php if ($hasData): ?>

    <div class="mt-5">
        <h3 class="text-pink">Your Saved Plan</h3>
        <?php foreach ($days as $i => $day): 
            $date = (clone $monday)->modify("+$i days")->format('Y-m-d');
        ?>
            <h5 class="mt-4"><?php echo $day; ?></h5>
            <?php foreach ($meals as $meal): ?>
                <p>
                    <?php
                    $recipeId = $saved[$date][$meal] ?? null;
                    $recipeTitle = 'None';
                    foreach ($recipes as $r) {
                        if ($r['id'] == $recipeId) {
                            $recipeTitle = $r['title'];
                            break;
                        }
                    }
                    echo ucfirst($meal) . ": " . htmlspecialchars($recipeTitle);
                    ?>
                </p>
            <?php endforeach; ?>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php include '../includes/footer.php'; ?>
