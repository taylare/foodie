<body class="register">
<?php include '../includes/header.php'; ?>

<div class="login-card card p-4 shadow-sm mx-auto">
  <h6 class="text-center">Register here:</h6><br>
  <form method="POST" action="register.php">
    <input type="text" name="username" class="form-control" placeholder="👤 Username" required>
    <input type="email" name="email" class="form-control" placeholder="📧 Email" required>
    <input type="password" name="password" class="form-control" placeholder="🔒 Password" required>
    <button type="submit" class="btn btn-pink w-100 mt-2">Register✨</button>
  </form>

<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    include '../includes/db.php';

    // Sanitize input
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    // Check for empty input (extra safety)
    if (empty($username) || empty($email) || empty($password)) {
        echo "<p class='text-danger mt-3 text-center'>❌ Please fill in all fields.</p>";
    } else {
        // Check if username or email already exists
        $checkStmt = $conn->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $checkStmt->bind_param("ss", $username, $email);
        $checkStmt->execute();
        $result = $checkStmt->get_result();

        if ($result->num_rows > 0) {
            echo "<p class='text-danger mt-3 text-center'>⚠️ Username or email already exists. Please choose another.</p>";
        } else {
            // Insert new user
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $username, $email, $hashedPassword);

            if ($stmt->execute()) {
                echo "<p class='text-success mt-3 text-center'>🎉 Registration successful! <a href='login.php'>Login here</a></p>";
            } else {
                echo "<p class='text-danger mt-3 text-center'>❌ Error: " . htmlspecialchars($stmt->error) . "</p>";
            }
        }

        $checkStmt->close();
        $stmt->close();
        $conn->close();
    }
}
?>
</div>

<?php include "../includes/footer.php" ?>
