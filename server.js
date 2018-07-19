const express     = require('express');
const bodyParser  = require('body-parser');

const app = express();

const port = process.env.PORT || 8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

require('./app/routes')(app);
app.listen(port, () => {
  console.log("we are live on " + port);
});
