const express = require("express");
const webpush = require("web-push");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Subscription = require("./models/subscription");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const publicVapidKey =
  "BLuZvc7QBbQmH_GjUf2oA4PNN9OjxYA-v6jMUzP5pnBt-tlH7bGcEl--bg0GRl6jzgholdPb2zvIGPwjjs-sUmc";
const privateVapidKey = "YdNUHEQmOk7C8r-NPtMwENYaAh11W6vTTK3cQ08Y_dQ";

webpush.setVapidDetails(
  "mailto:syakut@arkhe.com.tr",
  publicVapidKey,
  privateVapidKey,
);

app.post("/subscribe", async (req, res) => {
  try {
    const sub = req.body;
    await Subscription.findOneAndUpdate({ endpoint: sub.endpoint }, sub, {
      upsert: true,
      new: true,
    });

    res
      .status(201)
      .json({ success: true, data: "Subscription created successfully." });
  } catch (e) {
    res.status(500).json({ success: false, data: e.message });
  }
});

app.get("/send", async (req, res) => {
  const payload = JSON.stringify({
    title: "PWA",
    body: "Test mesajı gönderildi.",
  });

  const subs = await Subscription.find({});
  const count = subs.length;
  let sendCount = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
      sendCount++;
    } catch (err) {
      console.log("Push error:", err.statusCode);
      if (err.statusCode === 410) {
        await Subscription.deleteOne({ _id: sub._id });
      }
    }
  }

  console.log(`Sended ${sendCount}/${count} notifications!`);

  res.json({ success: true });
});

app.get("/", (req, res) =>
  res.status(200).json({ success: true, data: "API is OK." }),
);

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.CONN_URL)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server ${PORT} portu uzerinde aktif edildi!`),
    ),
  )
  .catch((err) => {
    throw err;
  });
