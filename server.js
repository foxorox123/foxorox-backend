const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const priceIds = {
  basic_monthly: "price_1ABCDxxx",
  basic_yearly: "price_1ABCDyyy",
  global_monthly: "price_1ABCDzzz",
  global_yearly: "price_1ABCDkkk"
};

app.post("/create-checkout-session", async (req, res) => {
  const { plan } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      mode: "subscription",
      success_url: "https://twojadomena.pl/success.html",
      cancel_url: "https://twojadomena.pl/cancel.html"
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Foxorox backend działa.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
