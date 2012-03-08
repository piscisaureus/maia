<?php

$description = $_POST['description'];
$email = $_POST['email'];
$data = $_POST['data'];

// Generate model ID
$modelId = sha1($data);

$link =
  'http://' . $_SERVER['SERVER_NAME'] .
  preg_replace("/((?!^)\\/)?save\\.php(\\?.*)?$/i", '', $_SERVER['REQUEST_URI']) .
  '#load=' . $modelId;

// Save the model
file_put_contents("data/$modelId.json", $data);

$message =
  "You saved a MAIA model. $description\n" .
  "\n" .
  "Click this link, or copy and paste it into your browser:\n" .
  "$link";

mail($email, "MAIA model saved", $message);

echo $message;

?>