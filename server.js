const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
const webpush = require("./utils/webpush");
require("dotenv").config();

const Subscription = require("./models/subscription");
const Task = require("./models/task");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

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

app.post("/send", async (req, res) => {
  try {
    const { title, message } = req.body;

    const payload = JSON.stringify({
      title,
      body: message,
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

    res.status(200).json({
      success: true,
      data: `Sended ${sendCount}/${count} notifications.`,
    });
  } catch (e) {
    res.status(500).json({ success: false, data: e.message });
  }
});

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ date: 1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, data: err.message });
  }
});

app.post("/add-task", async (req, res) => {
  try {
    const { title, message, date } = req.body;
    if (!title || !message || !date) {
      return res
        .status(400)
        .json({ success: false, data: "Eksik alanlar var." });
    }

    const task = await Task.create({ title, message, date });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/delete-task/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Task.findByIdAndDelete(id);
    res.json({ success: true, data: "Görev silindi." });
  } catch (err) {
    res.status(500).json({ success: false, data: err.message });
  }
});

app.get("/", (req, res) =>
  res.status(200).json({ success: true, data: "API is OK." }),
);

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.CONN_URL)
  .then(() => {
    app.listen(PORT, () =>
      console.log(`Server ${PORT} portu uzerinde aktif edildi!`),
    );

    cron.schedule("*/5 * * * * *", async () => {
      console.log("tick");
      const now = new Date();
      const offsetNow = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000,
      );
      const fiveMinutesLater = new Date(offsetNow.getTime() + 60 * 60 * 1000);

      const upcomingTasks = await Task.find({
        date: { $gte: offsetNow, $lte: fiveMinutesLater },
      });

      console.log(upcomingTasks);

      if (upcomingTasks.length === 0) return;

      const subscriptions = await Subscription.find();

      for (const task of upcomingTasks) {
        const payload = JSON.stringify({
          title: `Yaklaşan Görev: ${task.title}`,
          message: task.message,
          date: task.date,
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await Subscription.deleteOne({ _id: sub._id });
              console.log("Silinen abonelik:", sub.endpoint);
            } else {
              console.error("Bildirim hatası:", err);
            }
          }
        }
      }
    });
  })
  .catch((err) => {
    throw err;
  });
