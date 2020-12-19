const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
	pool: true,
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL_ADDRESS,
		pass: process.env.EMAIL_APP_SPECIFIC_PASSWORD,
	},
})

const createMailOptions = (to, verificationCode) => {
	return {
		from: process.env.EMAIL_APP_SPECIFIC_PASSWORD,
		to,
		subject: 'FlareBot Email Verification',
		text: '',
	}
}
