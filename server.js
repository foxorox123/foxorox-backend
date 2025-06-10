// ✅ BACKEND (server.js lub index.js)

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: "https://foxorox-frontend.vercel.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

const priceIds = {
  basic_monthly: "price_1RXdZUQvveS6IpXvhLVrxK4B",
  basic_yearly: "price_1RY3QnQvveS6IpXvZF5cQfW2",
  global_monthly: "price_1RY0pYQvveS6IpXvhyJQEk4Y",
  global_yearly: "price_1RY0cLQvveS6IpXvdkA3BN2D"
};

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

    res.json({ active: subscriptions.data.length > 0 });
  } catch (error) {
    console.error("Error checking subscription:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  const { plan, email } = req.body;

  const redirectMap = {
    basic_monthly: "downloads/basic",
    basic_yearly: "downloads/basic",
    global_monthly: "downloads/premium",
    global_yearly: "downloads/premium"
  };

  const redirectPath = redirectMap[plan] || "tips";

  try {
    const successUrl = `https://foxorox-frontend.vercel.app/${redirectPath}?email=${encodeURIComponent(email)}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: "https://foxorox-frontend.vercel.app/cancel.html"
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("Error creating session:", e.message);
    res.status(500).json({ error: e.message });
  }
});

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
    console.error("Download error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("Foxorox backend is running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
