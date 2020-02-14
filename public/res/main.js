const dom = document.getElementById('server-dom');

// Media Query, die das reCAPTCHA bei kleinen Geräten kompakt erscheinen lässt
if (window.matchMedia('screen and (max-width: 992px)').matches) {
	document.querySelector('.g-recaptcha').setAttribute('data-size', 'compact');
}

const contactform = document.getElementById('contact-form');
contactform.addEventListener('submit', submitData);

// Ersetzt alle ('g') Zeilenumbrüche des Strings ('\n') mit dem äquivalenten Zeichen von HTML ('<br/>'), da die E-Mail in HTML geschrieben wird.
function convertToHTML(msg) {
	return msg.replace(new RegExp('\n', 'g'), '<br/>');
}

function submitData(e) {
	e.preventDefault();

	const name = document.getElementById('name').value.trim();
	const email = document.getElementById('email').value.trim();
	const msg = document.getElementById('msg').value.trim();
	const recaptcha = document.getElementById('g-recaptcha-response').value;

	postContactRequest(name, email, convertToHTML(msg), recaptcha);
}

const error = [
	'Die Nachricht wurde erfolgreich gesendet.', // 0
	'Bitte fülle alle Felder aus.', // 1
	'Der Name bzw. die E-Mail Adresse ist zu lang.', // 2
	'Bitte fülle das reCAPTCHA aus.', // 3
	'Das reCAPTCHA ist falsch.', // 4
	'Der Server kann nicht erreicht werden.' // 5
];

function translateCode(code) {
	return error[code] || `Fehler ${code} ist undefiniert.`;
}

function setStatus(code, color, timeout) {
	dom.style.visibility = 'visible';
	dom.style.color = color;
	dom.innerHTML = translateCode(code);
	dom.style.marginBottom = '20px';
	dom.style.opacity = 1;
	if (timeout) {
		setTimeout(() => {
			dom.style.opacity = 0;
			setTimeout(() => {
				dom.innerHTML = '';
				dom.visibility = 'hidden';
			}, 300);
		}, 8000);
	}
}

function verifyClient(name, email, message, captcha) {
	// Mindestens ein Feld leer
	if (name === '' || email === '' || message === '') return 1;

	// Nachricht oder E-Mail Adresse zu lang
	if (name.length > 30 || email.length > 40) return 2;

	// reCAPTCHA wurde nicht ausgefüllt
	if (captcha === undefined || captcha === '' || captcha === null) return 3;

	return 0;
}

async function postContactRequest(name, email, message, captcha) {
	const clientCode = verifyClient(name, email, message, captcha);
	if (clientCode !== 0) {
		setStatus(clientCode, '#f00', false);
		return;
	}

	try {
		const res = await fetch('/api/contact', {
			method: 'POST',
			headers: {
				Accept: 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				contact: {
					name: name,
					email: email,
					message: message
				},
				captcha: captcha
			})
		});

		const data = await res.json();

		if (data.code === 0) {
			setStatus(0, '#0f0', true);
			contactform.reset();
		} else {
			setStatus(data.code, '#f00', false);
			console.error(`Anfrage gescheitert oder zurückgewiesen\nFehler: ${translateCode(data.code)}`);
		}

		grecaptcha.reset();
	} catch (err) {
		setStatus(5, '#f00', false);
		console.error(err);
	}
}
