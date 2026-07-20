// This is the "helper" program.
// It listens for requests from your webpage, asks Google Trends for real data,
// and sends the numbers back.

const express = require('express');
const googleTrends = require('google-trends-api');
const cors = require('cors');

const app = express();
app.use(cors()); // allows your webpage to talk to this helper

// This is the one "door" your webpage will knock on:
// example: /trends?product=LED cloud light
app.get('/trends', async (req, res) => {
  const product = req.query.product;

  if (!product) {
    return res.status(400).json({ error: 'No product name given' });
  }

  try {
    const results = await googleTrends.interestOverTime({
      keyword: product,
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6), // last 6 months
    });

    const data = JSON.parse(results);
    const points = data.default.timelineData.map(point => point.value[0]);

    res.json({ product, points });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch data', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Helper is running on port ' + PORT);
});
