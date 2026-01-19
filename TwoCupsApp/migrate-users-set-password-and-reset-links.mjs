import admin from "firebase-admin";
import fs from "node:fs";
import crypto from "node:crypto";

const serviceAccountPath = "./serviceAccountKey.json";
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Missing ${serviceAccountPath}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))),
});

// Put the users you want to migrate here.
// If you only have a few, this is simplest + safest.
const USERS = [
  { uid: "pKkhFbRq3gYCV4EJYunp43uNcTL2", email: "brett@betterthanunicorns.com" },
  { uid:"1mrQ4dnqzFOa0234Pj1GLoRzNxl1", email:"dianasmccall@gmail.com"},
  // { uid: "abc123", email: "person@example.com" }, // email optional if already on the user record
];

function randomTempPassword() {
  // 24 chars, URL-safe-ish
  return crypto.randomBytes(18).toString("base64url");
}

async function migrateOne({ uid, email }) {
  const user = await admin.auth().getUser(uid);

  const finalEmail = email ?? user.email;
  if (!finalEmail) {
    throw new Error(`UID ${uid} has no email. Set one first, or pass email in USERS.`);
  }

  const tempPassword = randomTempPassword();

  // This "upgrades" the account to email/password capable
  await admin.auth().updateUser(uid, {
    email: finalEmail,
    password: tempPassword,
    // optional: keep false if you want them to verify normally
    // emailVerified: true,
  });

  // Generate a reset link so they can set their own password
  const resetLink = await admin.auth().generatePasswordResetLink(finalEmail);

  return { uid, email: finalEmail, tempPassword, resetLink };
}

async function main() {
  if (USERS.length === 0) {
    console.error("Add users to the USERS array (uid + optional email).");
    process.exit(1);
  }

  const results = [];
  for (const u of USERS) {
    try {
      const r = await migrateOne(u);
      results.push(r);
      console.log("\n---");
      console.log(`UID:  ${r.uid}`);
      console.log(`Email:${r.email}`);
      console.log(`Temp Password (if needed): ${r.tempPassword}`);
      console.log(`Reset Link: ${r.resetLink}`);
    } catch (e) {
      console.error(`Failed for ${u.uid}:`, e.message);
    }
  }

  // Optionally write a file you can copy from
  fs.writeFileSync("./migration-output.json", JSON.stringify(results, null, 2));
  console.log("\nWrote migration-output.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
