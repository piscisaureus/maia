<?php

$modelId = $_GET['id'];
$data = file_get_contents("data/$modelId.json");

if ($data) {
  echo $data;
} else {
  header("HTTP/1.0 404 Not Found");
}

?>