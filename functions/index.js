const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "noreply.foxorox@gmail.com", // 👈 Twój email Gmail (lub firmowy Gmail)
    pass: "wfat mjvy jocd hykd" // 👈 Hasło aplikacji z Gmail (wygeneruj w ustawieniach konta Google!)
  }
});

exports.sendEmailOnDeviceSave = onDocumentWritten(
  "devices/{docId}",
  async (event) => {
    const data = event.data?.after?.data();
    if (data && data.pending_email) {
      const email = event.params.docId;
      const device_id = data.device_id;

      console.log(`📩 Sending device ID to: ${email}`);

      await transporter.sendMail({
        from: `"Foxorox" <noreply.foxorox@gmail.com>`,
        to: email,
        subject: "Your Foxorox Device ID",
        html: `
          <h2>Welcome to Foxorox!</h2>
          <p>Thank you for your subscription!</p>
          <p><strong>Your Device ID:</strong></p>
          <div style="padding:10px; background:#eee; border:1px solid #ccc; font-size:16px;">
            ${device_id}
          </div>
          <p>Please use this ID when logging into the AI program.</p>
          <p>Need help? Contact us at <a href="mailto:support@foxorox.com">support@foxorox.com</a></p>
          <p style="font-size:12px; color:#999;">Foxorox Team</p>
        `
      });

      // Po wysłaniu maila usuń flagę, by nie wysyłało ponownie:
      await event.data.after.ref.update({ pending_email: admin.firestore.FieldValue.delete() });

      console.log(`✅ Email sent to: ${email}`);
    }
  }
);
