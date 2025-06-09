const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();


// 🔐 CORS: tylko frontend z Vercela może korzystać
const corsOptions = {
  origin: "https://foxorox-frontend.vercel.app", // <-- Twój frontend URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

// 🧾 Cennik Stripe (zamień ID jeśli dodasz kolejne plany, ok)
const priceIds = {
  basic_monthly: "price_1RXdZUQvveS6IpXvhLVrxK4B",
  basic_yearly: "price_1RY3QnQvveS6IpXvZF5cQfW2",
  global_monthly: "price_1RY0pYQvveS6IpXvhyJQEk4Y",
  global_yearly: "price_1RY0cLQvveS6IpXvdkA3BN2D"
};

// 🚀 Endpoint do tworzenia sesji Stripe Checkout
app.post("/create-checkout-session", async (req, res) => {
  const { plan } = req.body;
  console.log("✔️ Otrzymano żądanie dla planu:", plan);

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      mode: "subscription",
      success_url: "https://foxorox-frontend.vercel.app/tips",
      cancel_url: "https://foxorox-frontend.vercel.app/cancel.html"
    });

    console.log("✅ Sesja utworzona:", session.url);
    res.json({ url: session.url });

  } catch (e) {
    console.error("❌ Błąd przy tworzeniu sesji:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Testowy GET
app.get("/", (req, res) => {
  res.send("✅ Foxorox backend działa.");
});

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Serwer działa na porcie ${port}`));
