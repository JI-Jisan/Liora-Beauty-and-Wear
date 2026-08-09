const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const seedAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();

    if (adminCount === 0) {
      const defaultEmail = process.env.ADMIN_EMAIL || "admin@jisantrends.com";
      const defaultPassword = process.env.ADMIN_PASSWORD || "admin123456";

      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await Admin.create({
        name: "Jisan Admin",
        email: defaultEmail,
        password: hashedPassword,
      });

      console.log("🔐 [ADMIN SEED] Default admin created successfully!");
      console.log(`   Email: ${defaultEmail}`);
      console.log(`   Password: ${defaultPassword}`);
    }
  } catch (error) {
    console.error("Admin seed error:", error.message);
  }
};

module.exports = seedAdmin;
