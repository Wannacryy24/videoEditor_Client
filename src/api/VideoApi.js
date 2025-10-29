const API_URL = "http://localhost:5000";

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return await res.json();
}

export async function trimVideo(filename, start, end) {
  const res = await fetch(`${API_URL}/api/trim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename, start, end }),
  });

  if (!res.ok) {
    throw new Error("Trim failed");
  }

  return await res.json();
}
