const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { Database } = require('@sqlitecloud/drivers');

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const databasestring = `sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`

function convertJson(input) {
  const result = {};

  input.forEach(item => {
      const date = item.date;
      if (!result[date]) {
          result[date] = {
              daycalorie: 0,
              meals: []
          };
      }
      result[date].daycalorie += item.calorie;
      result[date].meals.push({
        description: item.meal,
        period: item.timeofday,
        time: item.time,
        calories: item.calorie
      });
  });

  return Object.keys(result).map(date => ({
      date: date,
      daycalorie: result[date].daycalorie,
      meals: result[date].meals
  }));
}

// Middleware to check client secret
function authenticateClient(req, res, next) {
  const clientSecret = req.headers['x-client-secret'];
  if (clientSecret && clientSecret === process.env.SECRET_KEY) {
    next(); // Client secret is valid, proceed to the next middleware/route handler
  } else {
    res.status(401).json({ message: 'Unauthorized' }); // Client secret is invalid, respond with 401
  }
}

// Answer API requests.
router.get('/', authenticateClient, function (req, res) {
  res.set('Content-Type', 'application/json');
  res.send('{"message":"Hello from the custom server!"}');
});

// Answer API requests.
router.get('/test', function (req, res) {
  res.set('Content-Type', 'application/json');
  let date = new Date();

  res.send('{"message":"' + date + '"}');
});

router.get('/testSQLITE', async function (req, res) {
  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/chinook.sqlite?apikey=${process.env.SQLITEAPIKEY}`)
  //sqlitecloud://cigq2czusz.sqlite.cloud:8860?apikey=mZJ9pJdm59yrwpJ9q3x43Y9moUz7vRAlGy1addDZG8g
  let name = 'Breaking The Rules'

  let results = await database.sql`SELECT * FROM tracks WHERE name = ${name}`
  res.send(results);
});


router.post('/processphoto', async function (req, res) {

  const { image } = req.body;
  const { hint } = req.body;


  console.log('Received image:', image);
  console.log('Received hint:', hint)

  try {

    payload = {
      "model": "gpt-4o",
      "messages": [
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": "The user sent a picture of a food. Determine what the food is and the number of calories and send the results in only the following format. Do not include anything else. just a json string of the description and the calories:\n\n{'description':'<a short one sentence description of the food>','calories':<the amount of calories of the food}"
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "What’s in this image?"
            },
            {
              "type": "image_url",
              "image_url": {
                "url": image
              }
            }
          ]
        }
      ],
      "max_tokens": 100,
      "temperature": 0,
      "max_tokens": 100,
      "top_p": 1,
      "frequency_penalty": 0,
      "presence_penalty": 0,
    }

    const completion = await openai.chat.completions.create(payload);

    console.log('Response from OpenAI:', completion);
    content = JSON.parse(completion.choices[0].message.content.replace(/'/g, '"'))
    // content = JSON.parse("{'description':'A sandwich with melted cheese and vegetables, served with potato chips and a side of mixedfruit.','calories':700}".replace(/'/g, '"'))
    res.send(content);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });

  }


});

router.get('/userinfo/:userid', async (req, res) => {


  const userid = req.params.userid;

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`
                SELECT u.*,
                  m.curcal,
                  u.targetcalorie - m.curcal AS remainingcalories,
                  CASE
                  WHEN curcal > u.targetcalorie THEN 'OVER'
                  ELSE 'UNDER'
                  END                                AS overunder,
                Date('now') AS date
                FROM (SELECT ${userid}  as USER, IFNULL(
                    (select Sum(calorie) AS curcal
                    from meals
                    WHERE  USER = ${userid} 
                    AND Date(Datetime(date / 1000, 'unixepoch')) = Date('now')
                    GROUP  BY Strftime('%d', Datetime(date / 1000, 'unixepoch'))), 0) as curcal) m
                JOIN  users u
                on u.id = m.user
                ORDER  BY date DESC; `
  res.send(results);
})

router.get('/meals/:userid', async (req, res) => {


  const userid = req.params.userid;

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`
 select user, meal, calorie, 
			CASE
				WHEN DATE(date / 1000, 'unixepoch') = DATE('now') THEN 'Today'
				ELSE strftime('%m-%d-%Y', datetime(date / 1000, 'unixepoch'))
			END AS date, 
          CASE 
          WHEN strftime('%H', datetime(date / 1000, 'unixepoch')) BETWEEN '06' AND '11' THEN 'MRNG'
          WHEN strftime('%H', datetime(date / 1000, 'unixepoch')) BETWEEN '12' AND '13' THEN 'NOON'
          WHEN strftime('%H', datetime(date / 1000, 'unixepoch')) BETWEEN '14' AND '17' THEN 'AFTR'
          ELSE 'NGHT'
      END AS timeofday,
	  strftime('%H:%M', datetime(date / 1000, 'unixepoch')) as time
	  from meals where user = 1
  order by date desc;`

  const outputJson = convertJson(results);


  res.send(outputJson);
})

router.post('/meals/log', async (req, res) => {
  const { description } = req.body;
  const { calories } = req.body;
  const { user } = req.body;

  const date = new Date()

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`INSERT INTO meals(user,meal,calorie,date) values (${user},${description},${calories},${date.getTime()}) `
  res.send(results);
})

module.exports = router;