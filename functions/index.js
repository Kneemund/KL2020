const admin = require('firebase-admin');
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const express = require('express');
const request = require('request');

admin.initializeApp();
const app = express();

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: functions.config().gmail.mail,
		pass: functions.config().gmail.password
	}
});

function sendMail(data) {
	const mailOptions = {
		from: functions.config().gmail.mail,
		to: functions.config().gmail.mail,
		subject: `Kontaktanfrage von ${data.name}`,
		html: ` <h1>Kontakt</h1>
                <h2>Details</h2>
                <ul>
                    <li>Name: ${data.name}</li>
                    <li>E-Mail: ${data.email}</li>
                </ul>
                <h2>Nachricht</h2>
                <p>${data.message}</p>`
	};

	transporter.sendMail(mailOptions);
}

function verifyServer(name, email, message, captcha) {
	// Mindestens ein Feld leer
	if (name === '' || email === '' || message === '') return 1;

	// Nachricht oder E-Mail Adresse zu lang
	if (name.length > 30 || email.length > 40) return 2;

	// reCAPTCHA wurde nicht ausgefüllt
	if (captcha === undefined || captcha === '' || captcha === null) return 3;

	return 0;
}

function verifyCaptcha(captcha, ip) {
	const secretKey = functions.config().recaptcha.secretkey;
	const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}&remoteip=${ip}`;

	return request(verifyUrl, (_err, _response, body) => {
		body = JSON.parse(body);
		return body.success !== undefined && body.success;
	});
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// POST Anfragen an "/api/contact"
app.post('/api/contact', (req, res) => {
	// Eingabe
	const codeServer = verifyServer(
		req.body.contact.name,
		req.body.contact.email,
		req.body.contact.message,
		req.body.captcha
	);
	if (codeServer !== 0) {
		return res.json({ code: codeServer });
	}

	// reCAPTCHA
	const captcha = verifyCaptcha(req.body.captcha, req.connection.remoteAddress);
	if (!captcha) {
		return res.json({ code: 4 });
	}

	// Validierung bestanden
	sendMail(req.body.contact);
	return res.json({ code: 0 });
});

exports.contactRequest = functions.https.onRequest(app);
