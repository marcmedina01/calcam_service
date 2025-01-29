const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { Database } = require('@sqlitecloud/drivers');
const authenticate = require('../authentication');

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
        id: item.id,
        daycalorie: 0,
        meals: []
      };
    }
    result[date].daycalorie += item.calorie;
    result[date].meals.push({
      mealid: item.mealid,
      description: item.meal,
      period: item.timeofday,
      time: item.time,
      timestamp: item.timestamp,
      calories: item.calorie,
      fat: item.fat,
      protein: item.protein,
      carb: item.carbs,
    });
  });

  return Object.keys(result).map(date => ({
    id: result[date].id,
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

getuserid = async (authid) => {
  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)
  let results = await database.sql`select id from users where googleid =${authid}`
  return results[0].id


}
router.get('/test', authenticate, function (req, res) {
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


router.post('/:userid/processphoto', authenticate, async function (req, res) {
  console.log('processphoto')
  const { image } = req.body;
  const { hint } = req.body;
  const userid = await getuserid(req.params.userid)


  console.log('Received image:', image);
  console.log('Received hint:', hint)

  try {

    payload = {
      "model": "gpt-4o-mini",
      "messages": [
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": "The user sent a picture of a food. Determine what the food is and the number of calories and send the results in only the following format. Do not include anything else. just a json string of the description and the calories, carbohydrates, fat, and protein:\n{'description':'<a short one sentence description of the food>','calories':<the amount of calories of the food>,'carbs':<the amount of carbohydrates of the food in grams>,'fat':<the amount of fat of the food in grams>,'protein':<the amount of protein of the food in grams>}\n\nn If the image is not food of any kind or is not recognizable or if you don't know what the image is; return the following {'description':'No food image found.','calories':0,'carbs':0,'fat':0,'protein':0} \n\n if the image is a person return the following return the following {'description':'People are not food.','calories':0,'carbs':0,'fat':0,'protein':0}"
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "image_url",
              "image_url": {
                "url": image
              }
            }
          ]
        },
        {
          "role": "assistant",
          "content": [
            {
              "type": "text",
              "text": "{'description':'A piece of baked chicken breast with a crispy seasoning.','calories':165,'carbs':0,'fat':3.6,'protein':31}"
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "image_url",
              "image_url": {
                "url": image
              }
            }
          ]
        },
        {
          "role": "assistant",
          "content": [
            {
              "type": "text",
              "text": "{'description':'A sandwich with melted cheese and greens, served with potato chips and a fruit medley.','calories':550,'carbs':65,'fat':25,'protein':15}"
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "image_url",
              "image_url": {
                "url": image
              }
            }
          ]
        },
        {
          "role": "assistant",
          "content": [
            {
              "type": "text",
              "text": "{'description':'A piece of baked chicken breast with a crispy seasoning.','calories':165,'carbs':0,'fat':3.6,'protein':31}"
            }
          ]
        },
        {
          "role": "assistant",
          "content": [
            {
              "type": "text",
              "text": "{\"description\":\"A piece of baked chicken breast with a crispy seasoning.\",\"calories\":165,\"carbs\":0,\"fat\":3.6,\"protein\":31}"
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
      "response_format": {
        "type": "json_object"
      },
    }

    const completion = await openai.chat.completions.create(payload);

    console.log('Response from OpenAI:', completion.choices[0].message.content);
    content = JSON.parse(completion.choices[0].message.content.replace(/'/g, '"'))

    let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)
    await database.sql`INSERT INTO mealscans(userid,response) values (${userid},${completion.choices[0].message.content}) `

    // content = JSON.parse("{'description':'A sandwich with melted cheese and vegetables, served with potato chips and a side of mixedfruit.','calories':700}".replace(/'/g, '"'))

    res.send(content);

    // throw "error"
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });

  }


});

router.get('/:userid/info', authenticate, async (req, res) => {

  console.log(`/${req.params.userid}/info`)
  const userid = await getuserid(req.params.userid)

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`SELECT u.*, 
                                    IFNULL(m.curcal, 0) AS curcal, 
                                    tm.cal AS targetcalories, 
                                    IFNULL(m.curcal, 0) AS currentcalories, 
                                    tm.cal - IFNULL(m.curcal, 0) AS remainingcalories, 
                                    tm.fat AS targetfat, 
                                    IFNULL(m.curfat, 0) AS curfat, 
                                    tm.fat - IFNULL(m.curfat, 0) AS remainingfat, 
                                    tm.prot AS targetprotein, 
                                    IFNULL(m.curprot, 0) AS curprotein, 
                                    tm.prot - IFNULL(m.curprot, 0) AS remainingprotein, 
                                    tm.carb AS targetcarbs, 
                                    IFNULL(m.curcarbs, 0) AS curcarbs, 
                                    tm.carb - IFNULL(m.curcarbs, 0) AS remainingcarbs, 
                                    CASE 
                                        WHEN IFNULL(m.curcal, 0) > tm.cal THEN 'OVER'
                                        ELSE 'UNDER'
                                    END AS overunder,
                                    Date('now') AS date,
                                    lm.meal AS latestmeal,
                                    lm.calorie AS latestmealcal,
                                    lm.fat AS latestmealfat,
                                    lm.prot AS latestmealprotein,
                                    lm.carb AS latestmealcarbs,
                                    lm.date AS latestmealdate,
                                    IFNULL(ms.mealscanned, 0) AS mealscanned
                              FROM users u
                              LEFT JOIN (
                                  SELECT userid, 
                                        SUM(calorie) AS curcal, 
                                        SUM(fat) AS curfat, 
                                        SUM(prot) AS curprot, 
                                        SUM(carb) AS curcarbs
                                  FROM meals
                                  WHERE userid = ${userid}
                                    AND Date(Datetime(date / 1000, 'unixepoch')) = Date('now')
                                  GROUP BY userid
                              ) m ON u.id = m.userid
                              LEFT JOIN targetmacros tm ON u.id = tm.userid
                              LEFT JOIN (
                                  SELECT id AS mealid, userid, meal, calorie, fat, prot, carb, date
                                  FROM meals
                                  WHERE userid = ${userid}
                                  ORDER BY date DESC
                                  LIMIT 1
                              ) lm ON u.id = lm.userid
                              LEFT JOIN (
                                  SELECT userid, COUNT(*) AS mealscanned
                                  FROM mealscans
                                  WHERE userid = ${userid}
                                    AND Date(Datetime(timestamp, 'unixepoch')) = Date('now')
                                  GROUP BY userid
                              ) ms ON u.id = ms.userid
                              WHERE u.id =${userid}
                              ORDER BY date DESC;
                              `

  res.send(results);
})

router.get('/:userid/exist', authenticate, async (req, res) => {
  console.log(`/${req.params.userid}/exist`)
  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`SELECT EXISTS(SELECT 1 FROM users WHERE googleid = ${req.params.userid}) as exist;`

  res.send(results);
})


router.get('/:userid/meals', authenticate, async (req, res) => {
  console.log(`/${req.params.userid}/meals`)

  const userid = await getuserid(req.params.userid)

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`
  SELECT DENSE_RANK() OVER (ORDER BY DATE(date / 1000, 'unixepoch') DESC) AS id, 
       userid, 
       id AS mealid, 
       meal, 
       calorie, 
       fat, 
       prot AS protein, 
       carb AS carbs,
       CASE
           WHEN DATE(date / 1000, 'unixepoch') = DATE('now') THEN 'Today'
           WHEN DATE(date / 1000, 'unixepoch') = DATE('now', '-1 day') THEN 'Yesterday'
           ELSE strftime('%m-%d-%Y', datetime(date / 1000, 'unixepoch'))
       END AS date,
       strftime('%H:%M', datetime(date / 1000, 'unixepoch')) AS time,
       date AS timestamp
  FROM meals
  WHERE userid = ${userid}
  ORDER BY id ASC, mealid DESC;
`


  const outputJson = convertJson(results);


  res.send(outputJson);
})


router.put('/:userid/info', authenticate, async (req, res) => {
  console.log(`put - /${req.params.userid}/info`)

  const { targetcalorie } = req.body;
  const { targetfat } = req.body;
  const { targetprot } = req.body;
  const { targetcarb } = req.body;

  const userid = await getuserid(req.params.userid)
  const date = new Date()

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`UPDATE targetmacros set cal=${targetcalorie}, fat=${targetfat}, prot=${targetprot}, carb=${targetcarb} where userid=${userid} `
  res.send(results);
})


router.post('/:userid/info', authenticate, async (req, res) => {
  console.log(`post - /${req.params.userid}/info`)

  const { targetcalorie } = req.body;
  const { targetfat } = req.body;
  const { targetprot } = req.body;
  const { targetcarb } = req.body;

  const { name } = req.body;
  const date = new Date()

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let resultsuser = await database.sql`insert into users(user,googleid) values (${name},${req.params.userid});`
  const userid = await getuserid(req.params.userid)
  let resultmacros = await database.sql`insert into targetmacros(userid,cal,fat,prot,carb) values (${userid},${targetcalorie},${targetfat},${targetprot},${targetcarb});`
  res.send(resultsuser);
})


router.delete('/:userid/meals/:mealid', authenticate, async (req, res) => {
  console.log(`delete - /${req.params.userid}/meals/${req.params.mealid}`)

  const userid = await getuserid(req.params.userid)

  const mealid = req.params.mealid;
  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`delete from meals where id=${mealid} and userid = ${userid};`
  res.send(results);
})


router.post('/:userid/meal', authenticate, async (req, res) => {
  console.log(`post - /meal`)
  const { description } = req.body;
  const { calories } = req.body;
  const { fat } = req.body;
  const { prot } = req.body;
  const { carb } = req.body;
  const userid = await getuserid(req.params.userid)
  const date = new Date()

  let database = new Database(`sqlitecloud://cigq2czusz.sqlite.cloud:8860/calcam.sqlite?apikey=${process.env.SQLITEAPIKEY}`)

  let results = await database.sql`INSERT INTO meals(userid,meal,calorie,fat,prot,carb,date) values (${userid},${description},${calories},${fat},${prot},${carb},${date.getTime()}) `
  res.send(results);
})



module.exports = router;