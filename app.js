const express = require("express");
const app = express();
app.use(express.json());
const {
  models: { User },
} = require("./db");
const path = require("path");
const {
  models: { Note },
} = require("./db");

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", async (req, res, next) => {
  try {
    console.log(req.header.authorization);
    res.send(await User.byToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/users/notes", async (req, res, next) => {
  try {
    console.log(req.headers);
    if (req.headers.authorization) {
      const user = await User.byToken(req.headers.authorization);
      const notes = await user.getNotes();
      res.send(notes);
    }
  } catch (e) {
    next(e);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
