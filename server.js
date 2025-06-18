const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors({
  origin: ["https://foxorox-frontend.vercel.app", "https://foxorox.com", "https://www.foxorox.com"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(bodyParser.json());

const priceIds = {
  basic_monthly: "price_1RXdZUQvveS6IpXvhLVrxK4B",
  basic_yearly: "price_1RY3QnQvveS6IpXvZF5cQfW2",
  global_monthly: "price_1RY0pYQvveS6IpXvhyJQEk4Y",
  global_yearly: "price_1RY0cLQvveS6IpXvdkA3BN2D"
};

app.post("/create-checkout-session", async (req, res) => {
  const { plan, email } = req.body;
  if (!plan || !email) return res.status(400).json({ error: "Missing plan or email" });

  const success_url = `https://foxorox-frontend.vercel.app/returning?plan=${encodeURIComponent(plan)}&email=${encodeURIComponent(email)}`;
  const cancel_url = "https://foxorox-frontend.vercel.app/plans";

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      mode: "subscription",
      customer_email: email,
      success_url,
      cancel_url
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("Stripe error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/check-subscription", async (req, res) => {
  const { email, device_id } = req.body;
  if (!email || !device_id) return res.status(400).json({ error: "Missing email or device_id" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.json({ active: false });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    if (!subscriptions.data.length) return res.json({ active: false });

    const devicesFile = path.join(__dirname, "devices.json");
    let devices = fs.existsSync(devicesFile) ? JSON.parse(fs.readFileSync(devicesFile)) : {};

    if (!devices[email]) {
      devices[email] = device_id;
      fs.writeFileSync(devicesFile, JSON.stringify(devices));
    } else if (devices[email] !== device_id) {
      return res.status(403).json({ error: "Unauthorized device" });
    }

    const priceId = subscriptions.data[0].items.data[0].price.id;
    const plan = Object.entries(priceIds).find(([_, val]) => val === priceId)?.[0] || "unknown";

    res.json({ active: true, plan });
  } catch (e) {
    console.error("Check-subscription error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/payment-status', async (req, res) => {
  const sessionId = req.query.session_id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({ status: session.payment_status }); // np. 'paid', 'unpaid', 'no_payment_required'
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać sesji' });
  }
});

app.get("/download/:type", async (req, res) => {
  const { email } = req.query;
  const { type } = req.params;

  const googleDriveFileIds = {
    basic: "1Rrx0PuvXIqniixZRmi1r-rKYptczp6P5",
    premium: "1g8TkbYM8kjYGnnepYR8ZG7jkOU0v6dc1"
  };
  const fileId = googleDriveFileIds[type];
  if (!fileId || !email) return res.status(400).json({ error: "Invalid request" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.status(403).json({ error: "Customer not found" });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    if (!subscriptions.data.length) return res.status(403).json({ error: "No active subscription" });

    const priceId = subscriptions.data[0].items.data[0].price.id;
    const allowedBasic = ["price_1RXdZUQvveS6IpXvhLVrxK4B", "price_1RY3QnQvveS6IpXvZF5cQfW2"];
    const allowedPremium = ["price_1RY0pYQvveS6IpXvhyJQEk4Y", "price_1RY0cLQvveS6IpXvdkA3BN2D"];
    const isAuthorized = (type === "basic" && allowedBasic.includes(priceId)) || (type === "premium" && allowedPremium.includes(priceId));

    if (!isAuthorized) return res.status(403).json({ error: "Unauthorized" });

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    res.redirect(downloadUrl);
  } catch (e) {
    console.error("Download error:", e.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => res.send("Foxorox backend is running."));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
