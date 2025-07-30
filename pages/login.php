<body class="login">

<?php include '../includes/header.php'; ?>

<div class="login-card card p-4 shadow-sm mx-auto">
  <h6 class="text-pink fw-bold mb-4 text-center">Login 🍓</h6>
  <form method="POST" action="login.php">
    <input type="text" name="username" class="form-control" placeholder="👤 Username" required>
    <input type="password" name="password" class="form-control" placeholder="🔒 Password" required>
    <button type="submit" class="btn btn-pink w-100 mt-2">Login✨</button>
  </form>

  <?php
  if ($_SERVER["REQUEST_METHOD"] === "POST") {
      include '../includes/db.php';

      $input = trim($_POST['username']);
      $password = $_POST['password'];

      if (empty($input) || empty($password)) {
          echo "<p class='text-danger mt-3 text-center'>❌ Please fill in all fields.</p>";
      } else {
          // Allow login by either username or email
          $stmt = $conn->prepare("SELECT user_id, username, password FROM users WHERE username = ? OR email = ?");
          $stmt->bind_param("ss", $input, $input);
          $stmt->execute();
          $result = $stmt->get_result();

          if ($result->num_rows === 1) {
              $user = $result->fetch_assoc();

              if (password_verify($password, $user['password'])) {
                  $_SESSION['user_id'] = $user['user_id'];
                  $_SESSION['username'] = $user['username'];
                  header("Location: my-recipes.php");
                  exit;
              } else {
                  echo "<p class='text-danger mt-3 text-center'>❌ Incorrect password. Try again!</p>";
              }
          } else {
              echo "<p class='text-danger mt-3 text-center'>😕 No account found with that username or email.</p>";
          }

          $stmt->close();
          $conn->close();
      }
  }
  ?>
</div>

<?php include "../includes/footer.php" ?>
