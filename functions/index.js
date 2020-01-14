// Variablen
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const express = require('express');
const request = require('request');

// Initialisierung
admin.initializeApp();
const app = express();

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: functions.config().gmail.mail,
		pass: functions.config().gmail.password
	}
});

// Middleware
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

// Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Reagiert auf POST Requests von "/api/contact"
app.post('/api/contact', (req, res) => {
	// Validierung der Eingabe
	if (req.body.contact.name === '' || req.body.contact.email === '' || req.body.contact.message === '') {
		// Mindestens ein Feld ist leer
		return res.json({
			success: false,
			captcha: undefined,
			code: 1
		});
	}

	if (req.body.contact.name.length > 30 || req.body.contact.email.length > 40) {
		// Die Nachricht oder die E-Mail Adresse ist zu lang
		return res.json({
			success: false,
			captcha: undefined,
			code: 2
		});
	}

	if (req.body.captcha === undefined || req.body.captcha === '' || req.body.captcha === null) {
		// ReCaptcha wurde nicht ausgefüllt
		return res.json({
			success: false,
			captcha: undefined,
			code: 3
		});
	}

	// Captcha Validierung
	const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${functions.config().recaptcha
		.secretkey}&response=${req.body.captcha}&remoteip=${req.connection.remoteAddress}`;

	const captcha = request(verifyUrl, (_err, _response, body) => {
		body = JSON.parse(body);

		if (body.success !== undefined || !body.success) {
			return false;
		}

		return true;
	});

	if (!captcha) {
		// ReCaptcha ist falsch
		return res.json({
			success: false,
			captcha: captcha,
			code: 4
		});
	}

	// Daten haben Validierung bestanden

	sendMail(req.body.contact);

	return res.json({
		success: true,
		captcha: captcha,
		code: 0
	});
});

exports.contactRequest = functions.https.onRequest(app);
