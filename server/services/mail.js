const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.ethereal.email',
  port: process.env.MAIL_PORT || 587,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

async function sendMail({ to, subject, text }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || 'FitZone <noreply@fitzone.local>',
    to,
    subject,
    text,
  })
}

module.exports = {
  sendWillkommen: (email, name) =>
    sendMail({
      to: email,
      subject: 'Willkommen bei FitZone!',
      text: `Hallo ${name},\n\ndein Konto ist aktiv. Du kannst ab sofort Kurse buchen.\n\nDein FitZone-Team`,
    }),

  sendNachruecken: (email, name, kursName, datum) =>
    sendMail({
      to: email,
      subject: `Platz frei: ${kursName}`,
      text: `Hallo ${name},\n\nein Platz in "${kursName}" am ${datum} ist für dich frei geworden. Du bist jetzt gebucht.\n\nDein FitZone-Team`,
    }),

  sendKursabsage: (email, name, kursName, datum) =>
    sendMail({
      to: email,
      subject: `Kursabsage: ${kursName}`,
      text: `Hallo ${name},\n\nder Kurs "${kursName}" am ${datum} wurde leider abgesagt.\n\nDein FitZone-Team`,
    }),

  sendBuchungssperre: (email, name, freiAb) =>
    sendMail({
      to: email,
      subject: 'Buchungssperre aktiv',
      text: `Hallo ${name},\n\naufgrund von 3 aufeinanderfolgenden No-Shows ist dein Konto bis ${freiAb} gesperrt. Danach kannst du wieder buchen.\n\nDein FitZone-Team`,
    }),

  sendSperreFrei: (email, name) =>
    sendMail({
      to: email,
      subject: 'Buchungssperre aufgehoben',
      text: `Hallo ${name},\n\ndeine Buchungssperre ist aufgehoben. Du kannst wieder Kurse buchen.\n\nDein FitZone-Team`,
    }),

  sendZoomLink: (email, name, kursName, datum, zoomLink) =>
    sendMail({
      to: email,
      subject: `Zoom-Link: ${kursName}`,
      text: `Hallo ${name},\n\nhier ist dein Zoom-Link für "${kursName}" am ${datum}:\n${zoomLink}\n\nDein FitZone-Team`,
    }),
}
