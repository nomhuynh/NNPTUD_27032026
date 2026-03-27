const nodemailer = require("nodemailer");

// Create a transporter using Ethereal test credentials.
// For production, replace with your actual SMTP server details.
const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 25,
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "",
        pass: "",
    },
});
//http://localhost:3000/api/v1/auth/resetpassword/a87edf6812f235e997c7b751422e6b2f5cd95aa994c55ebeeb931ca67214d645

// Send an email using async/await;
module.exports = {
    sendMail: async function (to,url) {
        const info = await transporter.sendMail({
            from: 'admin@hehehe.com',
            to: to,
            subject: "reset pass",
            text: "click vo day de doi pass", // Plain-text version of the message
            html: "click vo <a href="+url+">day</a> de doi pass", // HTML version of the message
        });
    },
    /** Gửi mật khẩu tạm cho user mới (import Excel). */
    sendPasswordToNewUser: async function (to, username, plainPassword) {
        await transporter.sendMail({
            from: "admin@hehehe.com",
            to,
            subject: "Tai khoan duoc tao - mat khau dang nhap",
            text:
                `Xin chao ${username},\n` +
                `Mat khau dang nhap (16 ky tu): ${plainPassword}\n` +
                `Vui long doi mat khau sau khi dang nhap.`,
            html:
                `<p>Xin chao <b>${escapeHtml(username)}</b>,</p>` +
                `<p>Mat khau dang nhap (16 ky tu): <code>${escapeHtml(plainPassword)}</code></p>` +
                `<p>Vui long doi mat khau sau khi dang nhap.</p>`,
        });
    },
};

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
