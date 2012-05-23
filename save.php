<?php

// This is why I hate PHP.
if (get_magic_quotes_gpc()) {
  $process = array(&$_GET, &$_POST, &$_COOKIE, &$_REQUEST);
  while (list($key, $val) = each($process)) {
    foreach ($val as $k => $v) {
      unset($process[$key][$k]);
      if (is_array($v)) {
        $process[$key][stripslashes($k)] = $v;
        $process[] = &$process[$key][stripslashes($k)];
      } else {
        $process[$key][stripslashes($k)] = stripslashes($v);
      }
    }
  }
  unset($process);
}


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