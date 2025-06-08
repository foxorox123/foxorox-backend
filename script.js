function subscribe(plan) {
  fetch("https://foxorox-backend.onrender.com/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "basic_monthly" })  // lub inny
  })
  .then(res => res.json())
  .then(data => {
    if (data.url) window.location.href = data.url;
    else alert("Błąd: brak adresu Checkout.");
  });
}
