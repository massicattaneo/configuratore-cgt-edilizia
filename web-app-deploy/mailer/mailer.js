const nodemailer = require('nodemailer');
const webmail = require('../private/webmail');
const createTemplate = require('./createTemplate');
const isDeveloping = process.env.NODE_ENV === 'development';

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
        tls: { rejectUnauthorized: false }
    });

    obj.send = function (mailOptions) {
        if (isDeveloping) {
            console.log('*** Sending email', mailOptions.to);
            mailOptions.to = 'massi.cattaneo.it@gmail.com';
            mailOptions.bcc = '';
        }
        return new Promise(function (res, reject) {
            if (!mailOptions.from) {
                mailOptions.from = `"CGT EDILIZIA" <${webmail.email}>`;
            }
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return reject(new Error('mail-error'));
                }
                res(info);
            });
        });
    };

    obj.internalError = function (message) {
        obj.send(createTemplate('internal-error', { message }));
    };

    return obj;
};
