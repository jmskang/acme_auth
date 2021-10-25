const Sequelize = require("sequelize");
const { STRING, TEXT } = Sequelize;
const config = {
  logging: false,
};
const JWT = require("jsonwebtoken");
const bcrypt = require("bcrypt");

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
  token: {
    type: STRING,
    defaultValue: "none234",
  },
});

const Note = conn.define("note", {
  text: TEXT,
});

User.byToken = async (token) => {
  try {
    const { userId } = await JWT.verify(token, process.env.JWT);
    const user = await User.findByPk(userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials BYTOKEN");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });

  const match = await bcrypt.compare(password, user.password);

  if (match) {
    const token = await JWT.sign({ userId: user.id }, process.env.JWT);
    console.log("TOKEN: ", token);
    return token;
  }
  const error = Error("bad credentials AUTHENTICATE");
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
});

Note.belongsTo(User);
User.hasMany(Note);

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const notes = [
    { text: "lucys note" },
    { text: "moes note" },
    { text: "larrys note" },
  ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const userArr = [lucy, moe, larry];
  const notesArr = await Promise.all(notes.map((note) => Note.create(note)));

  for (let i = 0; i < notes.length; i++) {
    await userArr[i].addNote(notesArr[i]);
  }

  const larryNote2 = await Note.create({ text: "larrys note 2" });
  await larry.addNote(larryNote2);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
