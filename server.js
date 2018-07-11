const express     = require('express');
const bodyParser  = require('body-parser');

const app = express();

// const port = 8000;
const port = process.env.PORT || 8000;

app.use(bodyParser.urlencoded({ extended: true }));

require('./app/routes')(app);
app.listen(port, () => {
  console.log("we are live on " + port);
});
