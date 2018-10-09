const express     = require('express');
const bodyParser  = require('body-parser');
// const logger      = require('morgan');
// const crons       = require('./workers');
const MONGO_URL   = process.env.MONGODB_URI || 'mongodb://localhost:27017/rover'

const app         = express();
const mongoose    = require('mongoose');
const port        = process.env.PORT || 8000;

mongoose.connect(MONGO_URL, { useNewUrlParser: true })
mongoose.set('useCreateIndex', true)

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(logger('info'));

require('./app/routes')(app);
app.listen(port, () => {
  console.log("we are live on " + port);
});
