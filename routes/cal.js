const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// Answer API requests.
router.get('/', function (req, res) {
  res.set('Content-Type', 'application/json');
  res.send('{"message":"Hello from the custom server!"}');
});

// Answer API requests.
router.get('/test', function (req, res) {
  res.set('Content-Type', 'application/json');
  let date = new Date();

  res.send('{"message":"' + date + '"}');
});

router.post('/sendphoto', async function (req, res) {
  console.log(req.body)
  const { image } = req.body;
  const { hint } = req.body;

  console.log('Received image:', image);
  console.log('Received hint:', hint)

  // try {

  //     payload = {
  //         "model": "gpt-4o",
  //         "messages": [
  //           {
  //             "role": "user",
  //             "content": [
  //               {
  //                 "type": "text",
  //                 "text": "What’s in this image?"
  //               },
  //               {
  //                 "type": "image_url",
  //                 "image_url": {
  //                   "url": image
  //                 }
  //               }
  //             ]
  //           }
  //         ],
  //         "max_tokens": 100
  //       }

  //     const completion = await openai.chat.completions.create(payload);

  //     console.log('Response from OpenAI:', completion.choices);
  //     res.json(completion.choices);
  // } catch (error) {
  //     console.error('Error calling OpenAI API:', error);
  //     res.status(500).json({ error: 'Error calling OpenAI API' });

  // }


});


module.exports = router;