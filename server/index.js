require('dotenv').config()
const express = require('express')
const cors = require('cors')

const mitgliederRouter = require('./routes/mitglieder')
const mitgliedschaftenRouter = require('./routes/mitgliedschaften')
const tarifeRouter = require('./routes/tarife')
const kursterminRouter = require('./routes/kurstermine')
const buchungenRouter = require('./routes/buchungen')
const wartelisteRouter = require('./routes/warteliste')
const trainerRouter = require('./routes/trainer')
const zahlungenRouter = require('./routes/zahlungen')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/v1/mitglieder', mitgliederRouter)
app.use('/api/v1/mitgliedschaften', mitgliedschaftenRouter)
app.use('/api/v1/tarife', tarifeRouter)
app.use('/api/v1/kurstermine', kursterminRouter)
app.use('/api/v1/buchungen', buchungenRouter)
app.use('/api/v1/warteliste', wartelisteRouter)
app.use('/api/v1/trainer', trainerRouter)
app.use('/api/v1/zahlungen', zahlungenRouter)

app.listen(PORT, () => {
  console.log(`FitZone Server läuft auf http://localhost:${PORT}`)
})
