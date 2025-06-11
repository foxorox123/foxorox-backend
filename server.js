const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const app = express();

// Stripe
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// AWS SDK
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "eu-north-1"
});

// CORS
const corsOptions = {
  origin: "https://foxorox-frontend.vercel.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// === Stripe Plans ===
const priceIds = {
  basic_monthly: "price_1RXdZUQvveS6IpXvhLVrxK4B",
  basic_yearly: "price_1RY3QnQvveS6IpXvZF5cQfW2",
  global_monthly: "price_1RY0pYQvveS6IpXvhyJQEk4Y",
  global_yearly: "price_1RY0cLQvveS6IpXvdkA3BN2D"
};

const redirectMap = {
  basic_monthly: "downloads/basic",
  basic_yearly: "downloads/basic",
  global_monthly: "downloads/premium",
  global_yearly: "downloads/premium"
};

// === Stripe Checkout Session ===
app.post("/create-checkout-session", async (req, res) => {
  const { plan, email } = req.body;
  if (!plan || !email) return res.status(400).json({ error: "Missing plan or email" });

  const redirectPath = redirectMap[plan] || "plans";
  const success_url = `https://foxorox-frontend.vercel.app/${redirectPath}?email=${encodeURIComponent(email)}`;

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      mode: "subscription",
      customer_email: email,
      success_url,
      cancel_url: "https://foxorox-frontend.vercel.app/plans"
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("❌ Błąd przy tworzeniu sesji:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// === Check Subscription ===
app.post("/check-subscription", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.json({ active: false });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1
    });

    const isActive = subscriptions.data.length > 0;
    res.json({ active: isActive });
  } catch (e) {
    console.error("❌ Błąd subskrypcji:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// === S3 Download with Subscription Check ===
app.get("/download/s3", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.status(403).json({ error: "No customer found" });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1
    });

    if (!subscriptions.data.length) return res.status(403).json({ error: "No active subscription" });

    const params = {
      Bucket: "foxorox-downloads-2025", // <- Twój bucket S3
      Key: "FoxoroxApp.exe", // <- Nazwa pliku w bucket
      Expires: 600 // link ważny 10 minut
    };

    const url = s3.getSignedUrl("getObject", params);
    res.json({ url });
  } catch (error) {
    console.error("❌ S3 download error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// === Old local download (opcjonalnie usuń, jeśli używasz S3) ===
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
      limit: 1
    });

    if (!subscriptions.data.length) return res.status(403).json({ error: "No active subscription" });

    const filePath = path.join(__dirname, "downloads", "FoxoroxApp.exe");
    res.download(filePath, "FoxoroxApp.exe");
  } catch (error) {
    console.error("Download error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// === Root ===
app.get("/", (req, res) => {
  res.send("Foxorox backend is running.");
});

// === Start Server ===
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
