<body class="login">

<?php include '../includes/header.php'; ?>


<div class="login-card card p-4 shadow-sm mx-auto">
    <h6 class="text-pink fw-bold mb-4 text-center">Login 🍓</h6>
  <form method="POST" action="login.php">
    <input type="email" name="email" class="form-control" placeholder="📧 Email" required>
    <input type="password" name="password" class="form-control" placeholder="🔒 Password" required>
    <button type="submit" class="btn btn-pink w-100 mt-2">Login✨</button>
  </form>
</div>

<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    include '../includes/db.php';
    $email = $_POST['email'];
    $password = $_POST['password'];
    $stmt = $conn->prepare("SELECT user_id, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['user_id'];
            header("Location: my-recipes.php");
            exit;
        } else {
            echo "<p class='text-danger mt-3 text-center'>❌ Incorrect password. Try again!</p>";
        }
    } else {
        echo "<p class='text-danger mt-3 text-center'>😕 No account found with that email.</p>";
    }
}
?>

</body>