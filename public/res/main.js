// Variablen
const contactform = document.getElementById('contact-form');
const dom = document.getElementById('server-dom');

// Media Query, die das ReCaptcha bei kleinen Geräten kompakt erscheinen lässt
if (window.matchMedia('screen and (max-width: 992px)').matches) {
	document.querySelector('.g-recaptcha').setAttribute('data-size', 'compact');
}

// Funktion "submitData" wird bei Abschicken des Formulares ausgeführt
contactform.addEventListener('submit', submitData);

// Ersetzt alle ('g') Zeilenumbrüche in Strings ('\n') mit dem äquivalenten Zeichen von HTML, da die E-Mail in HTML geschrieben wird.
function convertToHTML(msg) {
	return msg.replace(new RegExp('\n', 'g'), '<br/>');
}

function submitData(e) {
	e.preventDefault();

	postContactRequest(
		document.getElementById('name').value.trim(),
		document.getElementById('email').value.trim(),
		convertToHTML(document.getElementById('msg').value.trim()),
		document.getElementById('g-recaptcha-response').value
	);
}

const error = [
	'Nachricht wurde erfolgreich gesendet.',
	'Bitte fülle alle Felder aus.',
	'Der Name bzw. die E-Mail Adresse ist zu lang.',
	'Bitte fülle das ReCaptcha aus.',
	'Das ReCaptcha ist falsch.'
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

async function postContactRequest(name, email, message, captcha) {
	try {
		const res = await fetch('/api/contact', {
			// POST URL: /api/contact
			method: 'POST', // Methode: POST
			headers: {
				Accept: 'application/json, text/plain, */*', // Akzeptierte Antworten
				'Content-Type': 'application/json' // Typ der Anfrage
			},
			body: JSON.stringify({
				// wandelt JavaScript Objekt in JSON String um
				contact: {
					name: name,
					email: email,
					message: message
				},
				captcha: captcha
			})
		});

		const data = await res.json();

		console.log(data);

		if (data.success) {
			setStatus(data.code, '#0f0', true);
			contactform.reset();
		} else {
			setStatus(data.code, '#f00', false);
			console.error(
				`Anfrage gescheitert oder zurückgewiesen\nFehler: ${translateCode(
					data.code
				)}\nReCaptcha: ${data.captcha}`
			);
		}

		grecaptcha.reset();
	} catch (err) {
		setStatus('Server kann nicht erreicht werden.', '#f00', false);
		console.error(err);
	}
}
