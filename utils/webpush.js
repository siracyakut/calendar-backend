const webpush = require("web-push");

const publicVapidKey =
  "BLuZvc7QBbQmH_GjUf2oA4PNN9OjxYA-v6jMUzP5pnBt-tlH7bGcEl--bg0GRl6jzgholdPb2zvIGPwjjs-sUmc";
const privateVapidKey = "YdNUHEQmOk7C8r-NPtMwENYaAh11W6vTTK3cQ08Y_dQ";

webpush.setVapidDetails(
  "mailto:syakut@arkhe.com.tr",
  publicVapidKey,
  privateVapidKey,
);

module.exports = webpush;
