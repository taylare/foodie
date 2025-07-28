<?php include '../includes/header.php'; 

// Redirect to login if not logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}
?>
<h2>Meal Planner</h2>
<p>(Planned meals will appear here once implemented.)</p>
<script src="../assets/js/planner.js"></script>


<?php include '../includes/footer.php'; ?>
