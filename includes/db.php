<?php
// Spoonacular API Key
$spoonacularApiKey = '8f88d2bd5ab6413ba6177781765f7576';

// Check if running locally
if ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1') {
    $hostname = 'localhost';
    $username = 'root';
    $pw = '';
    $db = 'foodie';
    $port = 3306; // default MySQL port
} else {
    // Railway / deepblue server settings
    $hostname = "shuttle.proxy.rlwy.net";
    $username = "root";
    $pw = "LEPcpmcWFsaDwdBSRZpRfFAuUBgcGuUU";
    $db = "foodie";
    $port = 25777; // Railway custom port
}

// Connect to the database
$conn = mysqli_connect($hostname, $username, $pw, $db, $port);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

// Optional: Uncomment to test connection
// echo "Database connection successful!";
?>
