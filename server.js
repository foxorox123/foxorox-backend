const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const corsOptions = {
  origin: [
    "https://foxorox-frontend.vercel.app",
    "https://www.foxorox.com",
    "https://foxorox.com"
  ],
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

app.post("/create-checkout-session", async (req, res) => {
  const { plan, email } = req.body;
  if (!plan || !email) return res.status(400).json({ error: "Missing plan or email" });

  const success_url = `https://foxorox-frontend.vercel.app/processing?plan=${encodeURIComponent(plan)}&email=${encodeURIComponent(email)}`;
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
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server on port ${port}`));
