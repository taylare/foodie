<?php include '../includes/header.php'; ?>
<h2>Login</h2>
<form method="POST" action="login.php">
    <input type="email" name="email" placeholder="Email" required><br>
    <input type="password" name="password" placeholder="Password" required><br>
    <button type="submit">Login</button>
</form>
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
            header("Location: home.php");
            exit;
        } else {
            echo "<p>Invalid credentials.</p>";
        }
    } else {
        echo "<p>User not found.</p>";
    }
}
?>
<?php include '../includes/footer.php'; ?>