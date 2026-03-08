document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([54.1137, -3.2184], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  L.marker([54.1137, -3.2184]).addTo(map);
});
