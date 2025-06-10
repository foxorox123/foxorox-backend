const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

require("dotenv").config();

// 🔐 CORS: tylko frontend z Vercela może korzystać
const corsOptions = {
  origin: "https://foxorox-frontend.vercel.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// 🧾 Cennik Stripe
const priceIds = {
  basic_monthly: "price_1RXdZUQvveS6IpXvhLVrxK4B",
  basic_yearly: "price_1RY3QnQvveS6IpXvZF5cQfW2",
  global_monthly: "price_1RY0pYQvveS6IpXvhyJQEk4Y",
  global_yearly: "price_1RY0cLQvveS6IpXvdkA3BN2D"
};

// ✅ Sprawdzenie subskrypcji po emailu
app.post("/check-subscription", async (req, res) => {
  const { email } = req.body;

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.json({ active: false });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const isActive = subscriptions.data.length > 0;
    res.json({ active: isActive });
  } catch (error) {
    console.error("❌ Błąd przy sprawdzaniu subskrypcji:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  const { plan } = req.body;
  console.log("✔️ Otrzymano żądanie dla planu:", plan);

  const redirectMap = {
    basic_monthly: "downloads/basic",
    basic_yearly: "downloads/basic",
    global_monthly: "downloads/premium",
    global_yearly: "downloads/premium"
  };

  const redirectPath = redirectMap[plan] || "tips"; // fallback na /tips

  try {
    let successUrl = "https://foxorox-frontend.vercel.app/dashboard";

    if (plan.startsWith("basic")) {
      successUrl = "https://foxorox-frontend.vercel.app/downloads/basic";
    } else if (plan.startsWith("global")) {
      successUrl = "https://foxorox-frontend.vercel.app/downloads/premium";
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: "https://foxorox-frontend.vercel.app/cancel.html"
    });

    console.log("✅ Sesja utworzona:", session.url);
    res.json({ url: session.url });
  } catch (e) {
    console.error("❌ Błąd przy tworzeniu sesji:", e.message);
    res.status(500).json({ error: e.message });
  }
});



// 🔒 Endpoint do pobierania .exe – tylko z aktywną subskrypcją
app.get("/download", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.status(403).json({ error: "No customer found" });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data.length) return res.status(403).json({ error: "No active subscription" });

    const filePath = path.join(__dirname, "downloads", "FoxoroxApp.exe");
    res.download(filePath, "FoxoroxApp.exe");
  } catch (error) {
    console.error("❌ Błąd przy pobieraniu pliku:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Testowy GET
app.get("/", (req, res) => {
  res.send("✅ Foxorox backend działa.");
});

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Serwer działa na porcie ${port}`));
