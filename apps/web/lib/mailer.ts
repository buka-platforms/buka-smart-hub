import nodemailer from "nodemailer";

export const sendMail = (
  email: string,
  subject: string,
  plainMessage: string,
  htmlMessage: string,
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SECRET_MAIL_HOST,
    port: process.env.SECRET_MAIL_PORT,
    auth: {
      user: process.env.SECRET_MAIL_USERNAME,
      pass: process.env.SECRET_MAIL_PASSWORD,
    },
  } as nodemailer.TransportOptions);

  const mailOptions = {
    from: `"${process.env.SECRET_MAIL_FROM_NAME}" <${process.env.SECRET_MAIL_FROM_ADDRESS}>`,
    to: email,
    subject: subject,
    text: plainMessage,
    html: htmlMessage,
  };

  transporter.sendMail(mailOptions, (error: unknown, info: unknown) => {
    if (error) {
      console.log(error);
    }
    if (typeof info === "object" && info !== null && "messageId" in info) {
      console.log("Message sent: %s", info.messageId);
    }
  });
};
