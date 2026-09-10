const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const seedAdmin = async () => {
  // Admin authentication is managed exclusively via Firebase (Firestore 'admins' collection).
  // Seeding to MongoDB has been disabled.
  return;
};

module.exports = seedAdmin;
