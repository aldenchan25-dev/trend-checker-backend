// This is the "helper" program.
// It listens for requests from your webpage, asks Google Trends for real data,
// and sends the numbers back.

const express = require('express');
const googleTrends = require('google-trends-api');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors()); // allows your webpage to talk to this helper

// This "door" reads a product link (starting with AliExpress) and pulls out the title.
// example: /product-title?url=https://www.aliexpress.com/item/xxxx.html
app.get('/product-title', async (req, res) => {
  const link = req.query.url;

  if (!link) {
    return res.status(400).json({ error: 'No product link given' });
  }

  try {
    const apiKey = process.env.SCRAPERAPI_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ScraperAPI key on the server' });
    }

    // Ask ScraperAPI to fetch the page for us, routed through the US so it comes back in English
    const scraperUrl = 'https://api.scraperapi.com?api_key=' + apiKey + '&country_code=us&url=' + encodeURIComponent(link);

    const pageResponse = await axios.get(scraperUrl, {
      timeout: 30000
    });

    const $ = cheerio.load(pageResponse.data);

    // Try a few common ways sites store the title, in order
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      '';

    title = title.trim();

    if (!title) {
      return res.status(500).json({ error: 'Could not find a title on that page' });
    }

    res.json({ url: link, title });
  } catch (err) {
    res.status(500).json({ error: 'Could not read that page', details: err.message });
  }
});

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
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6),
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
