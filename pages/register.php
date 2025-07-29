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
      $username = $_POST['username'];
      $email = $_POST['email'];
      $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
      $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
      $stmt->bind_param("sss", $username, $email, $password);
      if ($stmt->execute()) {
          echo "<p class='text-success mt-3 text-center'>🎉 Registration successful! <a href='login.php'>Login here</a></p>";
      } else {
          echo "<p class='text-danger mt-3 text-center'>❌ Error: " . $stmt->error . "</p>";
      }
  }
  ?>
</div>
</body>
