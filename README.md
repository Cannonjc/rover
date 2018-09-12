# Rover

Node app for scraping websites. Currently just accepts a URL parameter and then scraps for the html content, screenshot, or both.

After cloning, run:

npm install

then

npm run dev

to run the dev environment. Found on localhost:8000

to run the dev environment with a specific port(like 3000), run:

PORT=3000 npm run dev

to run this in non-dev mode, and with a specified port, run:

PORT=3000 npm start


If sending to Hoover - need to start hoover local with rails s -b 0.0.0.0 -s 3003, unless Hoover is updated/fixed
