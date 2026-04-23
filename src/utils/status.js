export function getStatusClass(value) {
  const status = value.toLowerCase();

  if (status === "success" || status === "succeeded" || status === "info") {
    return "green";
  }

  if (status === "warn" || status === "warning") {
    return "yellow";
  }

  if (status === "failed" || status === "error" || status === "offline") {
    return "red";
  }

  return "gray";
}