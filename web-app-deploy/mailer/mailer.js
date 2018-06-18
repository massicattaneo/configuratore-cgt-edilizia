const nodemailer = require('nodemailer');
const webmail = require('../private/dondominio-webmail');

module.exports = function () {
    const obj = {};

    const transporter = nodemailer.createTransport({
        host: webmail.smtpHost,
        port: webmail.smtpPort,
        secure: false, // true for 465, false for other ports
        auth: {
            user: webmail.user,
            pass: webmail.password
        },
        tls: {
            // do not faFil on invalid certs
            rejectUnauthorized: false
        },
        requireTLS: true
    });

    obj.send = function (mailOptions) {
        return new Promise(function (res, reject) {
            mailOptions.from = `"CGT EDILIZIA" <${webmail.user}>`;
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return reject(new Error('mail-error'))
                }
                res(info);
            });
        })
    };

    return obj;
};
