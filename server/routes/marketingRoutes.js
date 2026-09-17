const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const {
  generateFBCaption,
  generateProductBanner,
  batchGenerateBrandPromotions,
  pickSmartTheme,
  THEMES
} = require('../services/fbPromotionService');

const TARGET_300_IDS = [
  "6a9ab981c63dd531aa8db110", "6a9ab987c63dd531aa8db12a", "6a9ab77134ccee884a4b5cab", "6a9ab74b661657cb254c1bd5", "6a9aad6ae4955f357f776448",
  "6a8ae1ccdbc554e2928be214", "6a8e6c9d6d43fcfea47cad88", "6a8e6d7682271de00ebfa736", "6a8e6e13297e3906134a82f6", "6a8e6eafe9601eacddbf7dbb",
  "6a8e702551c7c127243ea1c1", "6a8e70f151c7c127243ea1c2", "6a8e723151c7c127243ea1c3", "6a8e72fa51c7c127243ea1c4", "6a8e757fc63423be0cf51d31",
  "6a9ab748661657cb254c1bd2", "6a9ab77434ccee884a4b5cae", "6a9ab75b661657cb254c1bdd", "6a9ab70979e75ff1fa1f8a47", "6a9abe31c63dd531aa8dc0b3",
  "6a9ac285c63dd531aa8dcd24", "6a9ac280c63dd531aa8dcd18", "6a9aba0cc63dd531aa8db330", "6a9abf47c63dd531aa8dc404", "6a9ac288c63dd531aa8dcd30",
  "6a9ab77734ccee884a4b5cb0", "6a9ab9f3c63dd531aa8db2dc", "6a9aba53c63dd531aa8db430", "6a9ac1bec63dd531aa8dcb1d", "6a9ac1bac63dd531aa8dcb15",
  "6a9ac11ac63dd531aa8dc96f", "6a9ac0bac63dd531aa8dc881", "6a9ac03bc63dd531aa8dc6e5", "6a9abff3c63dd531aa8dc5fb", "6a9abcf0c63dd531aa8dbc74",
  // Batch 5 (15 items)
  "6aa2ffd70d2b8add7c6efbd0", "6a9ab97dc63dd531aa8db0f6", "6a9ab97fc63dd531aa8db100", "6a9ab97fc63dd531aa8db104", "6a9ab97ec63dd531aa8db0fd",
  "6a9ab97bc63dd531aa8db0f4", "6a9ab97fc63dd531aa8db101", "6a9ab982c63dd531aa8db114", "6a9ab97ec63dd531aa8db0f9", "6a9ab97fc63dd531aa8db107",
  "6a9ab980c63dd531aa8db109", "6a9ab982c63dd531aa8db119", "6a9ab982c63dd531aa8db118", "6a9ab97ec63dd531aa8db0fc", "6a9ab980c63dd531aa8db10c",
  // Batch 6 (20 items)
  "6a9ab989c63dd531aa8db13d", "6a9ab987c63dd531aa8db12b", "6a9ab983c63dd531aa8db11c", "6a9ab989c63dd531aa8db13c", "6a9ab988c63dd531aa8db132",
  "6a9ab986c63dd531aa8db126", "6a9ab989c63dd531aa8db141", "6a9ab98ac63dd531aa8db143", "6a9ab987c63dd531aa8db130", "6a9ab984c63dd531aa8db11e",
  "6a9ab988c63dd531aa8db138", "6a9ab988c63dd531aa8db133", "6a9ab985c63dd531aa8db124", "6a9ab989c63dd531aa8db13b", "6a9ab980c63dd531aa8db10d",
  "6a9ab98cc63dd531aa8db14b", "6a9ab98ac63dd531aa8db148", "6a9ab987c63dd531aa8db129", "6a9ab985c63dd531aa8db121", "6a9ab988c63dd531aa8db137",
  // Batch 7 (20 items)
  "6a9ab996c63dd531aa8db16e", "6a9ab991c63dd531aa8db15b", "6a9ab997c63dd531aa8db173", "6a9ab996c63dd531aa8db167", "6a9ab992c63dd531aa8db15e",
  "6a9ab990c63dd531aa8db156", "6a9ab98ec63dd531aa8db14e", "6a9ab997c63dd531aa8db171", "6a9ab992c63dd531aa8db15d", "6a9ab98ec63dd531aa8db150",
  "6a9ab996c63dd531aa8db166", "6a9ab993c63dd531aa8db161", "6a9ab990c63dd531aa8db155", "6a9ab996c63dd531aa8db16d", "6a9ab98ec63dd531aa8db14d",
  "6a9ab999c63dd531aa8db17a", "6a9ab998c63dd531aa8db178", "6a9ab990c63dd531aa8db157", "6a9ab98fc63dd531aa8db153", "6a9ab993c63dd531aa8db164",
  // Batch 8 (30 items)
  "6a9ab9a1c63dd531aa8db1a2", "6a9ab9a3c63dd531aa8db1aa", "6a9ab99dc63dd531aa8db18a", "6a9ab9a0c63dd531aa8db19b", "6a9ab9a4c63dd531aa8db1b3",
  "6a9ab99cc63dd531aa8db186", "6a9ab9a1c63dd531aa8db1a6", "6a9ab999c63dd531aa8db17b", "6a9ab9a3c63dd531aa8db1ae", "6a9ab99ec63dd531aa8db18e",
  "6a9ab9a0c63dd531aa8db19a", "6a9ab9a5c63dd531aa8db1bc", "6a9ab99cc63dd531aa8db183", "6a9ab9a0c63dd531aa8db19f", "6a9ab9a8c63dd531aa8db1c0",
  "6a9ab9a1c63dd531aa8db1a3", "6a9ab99cc63dd531aa8db188", "6a9ab9a2c63dd531aa8db1a8", "6a9ab9a8c63dd531aa8db1c1", "6a9ab9a3c63dd531aa8db1ab",
  "6a9ab99ec63dd531aa8db18d", "6a9ab9a3c63dd531aa8db1b0", "6a9ab999c63dd531aa8db17e", "6a9ab9a4c63dd531aa8db1b5", "6a9ab99ec63dd531aa8db192",
  "6a9ab9a9c63dd531aa8db1c6", "6a9ab9a8c63dd531aa8db1c4", "6a9ab999c63dd531aa8db180", "6a9ab99fc63dd531aa8db196", "6a9ab9a7c63dd531aa8db1be",
  // Batch 9 (30 items)
  "6a9ab9b0c63dd531aa8db1e7", "6a9ab9b2c63dd531aa8db1f0", "6a9ab9acc63dd531aa8db1d4", "6a9ab9afc63dd531aa8db1e4", "6a9ab9b6c63dd531aa8db1f8",
  "6a9ab9abc63dd531aa8db1d1", "6a9ab9b1c63dd531aa8db1ea", "6a9ab9aac63dd531aa8db1c8", "6a9ab9b5c63dd531aa8db1f4", "6a9ab9aec63dd531aa8db1d9",
  "6a9ab9afc63dd531aa8db1df", "6a9ab9b8c63dd531aa8db1fc", "6a9ab9abc63dd531aa8db1cf", "6a9ab9afc63dd531aa8db1e3", "6a9ab9b8c63dd531aa8db1fe",
  "6a9ab9b1c63dd531aa8db1e9", "6a9ab9acc63dd531aa8db1d3", "6a9ab9b2c63dd531aa8db1ec", "6a9ab9b9c63dd531aa8db202", "6a9ab9b5c63dd531aa8db1f2",
  "6a9ab9aec63dd531aa8db1d7", "6a9ab9b5c63dd531aa8db1f5", "6a9ab9aac63dd531aa8db1cb", "6a9ab9b7c63dd531aa8db1fa", "6a9ab9aec63dd531aa8db1da",
  "6a9ab9bac63dd531aa8db206", "6a9ab9bac63dd531aa8db204", "6a9ab9aac63dd531aa8db1cd", "6a9ab9aec63dd531aa8db1dd", "6a9ab9b8c63dd531aa8db1fd",
  // Batch 10 (30 items)
  "6a9ab9c2c63dd531aa8db229", "6a9ab9c5c63dd531aa8db232", "6a9ab9bec63dd531aa8db218", "6a9ab9c0c63dd531aa8db224", "6a9ab9c7c63dd531aa8db23a",
  "6a9ab9bcc63dd531aa8db212", "6a9ab9c4c63dd531aa8db22f", "6a9ab9bac63dd531aa8db208", "6a9ab9c6c63dd531aa8db237", "6a9ab9bec63dd531aa8db21d",
  "6a9ab9c0c63dd531aa8db223", "6a9ab9c8c63dd531aa8db241", "6a9ab9bcc63dd531aa8db210", "6a9ab9c2c63dd531aa8db228", "6a9ab9c9c63dd531aa8db245",
  "6a9ab9c3c63dd531aa8db22c", "6a9ab9bdc63dd531aa8db216", "6a9ab9c5c63dd531aa8db231", "6a9ab9c9c63dd531aa8db248", "6a9ab9c5c63dd531aa8db235",
  "6a9ab9bec63dd531aa8db219", "6a9ab9c7c63dd531aa8db239", "6a9ab9bbc63dd531aa8db20b", "6a9ab9c7c63dd531aa8db23d", "6a9ab9bfc63dd531aa8db21f",
  "6a9ab9ccc63dd531aa8db24e", "6a9ab9cac63dd531aa8db24c", "6a9ab9bbc63dd531aa8db20e", "6a9ab9c0c63dd531aa8db222", "6a9ab9c8c63dd531aa8db243",
  // Batch 11 (30 items)
  "6a9ab9d5c63dd531aa8db270", "6a9ab9d8c63dd531aa8db279", "6a9ab9d2c63dd531aa8db25f", "6a9ab9d5c63dd531aa8db26d", "6a9ab9dac63dd531aa8db282",
  "6a9ab9d2c63dd531aa8db25b", "6a9ab9d7c63dd531aa8db275", "6a9ab9ccc63dd531aa8db250", "6a9ab9d9c63dd531aa8db27d", "6a9ab9d3c63dd531aa8db264",
  "6a9ab9d4c63dd531aa8db269", "6a9ab9dbc63dd531aa8db286", "6a9ab9cec63dd531aa8db257", "6a9ab9d5c63dd531aa8db26e", "6a9ab9dbc63dd531aa8db28a",
  "6a9ab9d6c63dd531aa8db273", "6a9ab9d2c63dd531aa8db25d", "6a9ab9d8c63dd531aa8db277", "6a9ab9dbc63dd531aa8db28c", "6a9ab9d8c63dd531aa8db27b",
  "6a9ab9d2c63dd531aa8db262", "6a9ab9d9c63dd531aa8db280", "6a9ab9cec63dd531aa8db255", "6a9ab9dac63dd531aa8db283", "6a9ab9d3c63dd531aa8db265",
  "6a9ab9dec63dd531aa8db28f", "6a9ab9dec63dd531aa8db28e", "6a9ab9cec63dd531aa8db256", "6a9ab9d4c63dd531aa8db268", "6a9ab9dbc63dd531aa8db287",
  // Batch 12 (30 items)
  "6a9ab9e6c63dd531aa8db2b5", "6a9ab9e8c63dd531aa8db2be", "6a9ab9e3c63dd531aa8db2a0", "6a9ab9e6c63dd531aa8db2b3", "6a9ab9edc63dd531aa8db2c8",
  "6a9ab9e2c63dd531aa8db29c", "6a9ab9e8c63dd531aa8db2bb", "6a9ab9dfc63dd531aa8db292", "6a9ab9ecc63dd531aa8db2c4", "6a9ab9e4c63dd531aa8db2a7",
  "6a9ab9e5c63dd531aa8db2b1", "6a9ab9efc63dd531aa8db2cc", "6a9ab9e1c63dd531aa8db298", "6a9ab9e6c63dd531aa8db2b4", "6a9ab9efc63dd531aa8db2d0",
  "6a9ab9e7c63dd531aa8db2b9", "6a9ab9e3c63dd531aa8db29f", "6a9ab9e8c63dd531aa8db2bc", "6a9ab9f1c63dd531aa8db2d4", "6a9ab9e9c63dd531aa8db2c1",
  "6a9ab9e3c63dd531aa8db2a1", "6a9ab9ecc63dd531aa8db2c6", "6a9ab9e0c63dd531aa8db294", "6a9ab9edc63dd531aa8db2c9", "6a9ab9e4c63dd531aa8db2ac",
  "6a9ab9f2c63dd531aa8db2d8", "6a9ab9f1c63dd531aa8db2d6", "6a9ab9e1c63dd531aa8db296", "6a9ab9e4c63dd531aa8db2ad", "6a9ab9efc63dd531aa8db2ce",
  // Batch 13 (30 items)
  "6a9ab9fbc63dd531aa8db2fa", "6a9ab9ffc63dd531aa8db304", "6a9ab9f5c63dd531aa8db2e8", "6a9ab9fbc63dd531aa8db2f6", "6a9aba02c63dd531aa8db30e",
  "6a9ab9f5c63dd531aa8db2e4", "6a9ab9fec63dd531aa8db2fe", "6a9ab9f2c63dd531aa8db2da", "6a9aba00c63dd531aa8db308", "6a9ab9f6c63dd531aa8db2ec",
  "6a9ab9f7c63dd531aa8db2f4", "6a9aba02c63dd531aa8db312", "6a9ab9f4c63dd531aa8db2e1", "6a9ab9fbc63dd531aa8db2f7", "6a9aba04c63dd531aa8db316",
  "6a9ab9fdc63dd531aa8db2fc", "6a9ab9f5c63dd531aa8db2e5", "6a9ab9fec63dd531aa8db301", "6a9aba04c63dd531aa8db317", "6a9aba00c63dd531aa8db306",
  "6a9ab9f5c63dd531aa8db2e9", "6a9aba01c63dd531aa8db30c", "6a9ab9f3c63dd531aa8db2de", "6a9aba02c63dd531aa8db30f", "6a9ab9f7c63dd531aa8db2ef",
  "6a9aba05c63dd531aa8db31c", "6a9aba04c63dd531aa8db31a", "6a9ab9f4c63dd531aa8db2e0", "6a9ab9f7c63dd531aa8db2f2", "6a9aba03c63dd531aa8db314",
  // Batch 10 (30 items)
  "6a9aba10c63dd531aa8db340", "6a9aba12c63dd531aa8db349", "6a9aba0bc63dd531aa8db32c", "6a9aba0fc63dd531aa8db33c", "6a9aba14c63dd531aa8db353",
  "6a9aba0ac63dd531aa8db328", "6a9aba11c63dd531aa8db345", "6a9aba06c63dd531aa8db320", "6a9aba14c63dd531aa8db34f", "6a9aba0dc63dd531aa8db334",
  "6a9aba0ec63dd531aa8db33a", "6a9aba18c63dd531aa8db357", "6a9aba19c63dd531aa8db35d", "6a9aba0fc63dd531aa8db33e", "6a9aba1ac63dd531aa8db35f",
  "6a9aba10c63dd531aa8db343", "6a9aba0ac63dd531aa8db32a", "6a9aba11c63dd531aa8db346", "6a9aba1bc63dd531aa8db361", "6a9aba13c63dd531aa8db34d",
  "6a9aba0cc63dd531aa8db332", "6a9aba14c63dd531aa8db351", "6a9aba06c63dd531aa8db321", "6a9aba17c63dd531aa8db355", "6a9aba0dc63dd531aa8db335",
  "6a9aba1cc63dd531aa8db364", "6a9aba1cc63dd531aa8db363", "6a9aba07c63dd531aa8db324", "6a9aba0dc63dd531aa8db336", "6a9aba19c63dd531aa8db35b"
];

// 1. Get all brands with active products for dropdown
router.get('/brands', async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 }).lean();
    // Count products per brand
    const counts = await Product.aggregate([
      { $match: { brand: { $ne: null } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const enriched = [
      {
        _id: 'instock_ready',
        name: `🔥 প্রস্তুতকৃত ${TARGET_300_IDS.length}টি ইন-স্টক ব্যানার (Ready ${TARGET_300_IDS.length} Banners)`,
        slug: 'instock_ready',
        productCount: TARGET_300_IDS.length
      },
      ...brands.map(b => ({
        _id: b._id,
        name: b.name,
        slug: b.slug,
        productCount: countMap[b._id.toString()] || 0
      })).filter(b => b.productCount > 0)
    ];

    res.json({ success: true, brands: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get products for a selected brand
router.get('/products', async (req, res) => {
  try {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ success: false, error: 'brandId is required' });
    }

    let products = [];
    if (brandId === 'instock_ready') {
      const raw = await Product.find({ _id: { $in: TARGET_300_IDS } })
        .populate('category', 'name')
        .populate('brand', 'name')
        .lean();
      const map = new Map(raw.map((p) => [p._id.toString(), p]));
      products = TARGET_300_IDS.map((id) => map.get(id)).filter(Boolean);
    } else {
      const query = {
        $or: [
          { brand: brandId },
          { brand: new mongoose.Types.ObjectId(brandId) }
        ]
      };

      products = await Product.find(query)
        .populate('category', 'name')
        .populate('brand', 'name')
        .limit(100)
        .lean();
    }

    res.json({
      success: true,
      total: products.length,
      products: products.map(p => ({
        _id: p._id,
        name: p.name,
        originalPrice: p.originalPrice,
        offerPrice: p.offerPrice,
        image: p.image || (p.images && p.images[0]) || '',
        category: p.category?.name || '',
        brand: p.brand?.name || '',
        smartTheme: pickSmartTheme(p.name, p.category?.name)
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Live Preview of Single Product Banner & Caption
router.get('/preview/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { theme } = req.query;

    const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const caption = generateFBCaption(product, product.brand?.name || 'LIORA');
    let bannerBuffer = null;
    try {
      const { regenerateBannerForProduct } = require('../services/dynamicBannerService');
      const bRes = await regenerateBannerForProduct(product._id);
      bannerBuffer = bRes.buffer;
    } catch (e) {
      bannerBuffer = await generateProductBanner(product, theme);
    }

    res.json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        originalPrice: product.originalPrice,
        offerPrice: product.offerPrice,
        brand: product.brand?.name || 'LIORA'
      },
      theme: theme || pickSmartTheme(product.name, product.category?.name),
      caption,
      bannerBase64: `data:image/png;base64,${bannerBuffer.toString('base64')}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Download Single Product Banner directly as image file
router.get('/banner-download/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { theme } = req.query;

    const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();

    if (!product) {
      return res.status(404).send('Product not found');
    }

    let bannerBuffer = null;
    try {
      const { regenerateBannerForProduct } = require('../services/dynamicBannerService');
      const bRes = await regenerateBannerForProduct(product._id);
      bannerBuffer = bRes.buffer;
    } catch (e) {
      bannerBuffer = await generateProductBanner(product, theme);
    }
    const filename = `banner_${product.slug || product._id}.png`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(bannerBuffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 5. Batch Generator for Brand (creates ZIP bundle & text summary)
router.post('/batch-generate', async (req, res) => {
  try {
    const { brandId, brandName, limit = 100 } = req.body;
    const brandQuery = brandId || brandName;
    if (!brandQuery) {
      return res.status(400).json({ success: false, error: 'brandId or brandName is required' });
    }

    const result = await batchGenerateBrandPromotions({
      brandQuery,
      limit: Number(limit) || 100
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get / Save Facebook Configuration (Page ID & Access Token)
const SiteSettings = require('../models/SiteSettings');

router.get('/fb-config', async (req, res) => {
  try {
    let settings = await SiteSettings.findOne().lean();
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    res.json({
      success: true,
      fbPageId: settings.fbPageId || '1213659151838727',
      hasToken: !!settings.fbPageAccessToken,
      tokenMasked: settings.fbPageAccessToken ? `${settings.fbPageAccessToken.slice(0, 10)}...${settings.fbPageAccessToken.slice(-6)}` : '',
      fbAppId: settings.fbAppId || '974777838976699'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fb-config', async (req, res) => {
  try {
    const { fbPageId, fbPageAccessToken } = req.body;
    let settings = await SiteSettings.findOne();
    if (!settings) settings = new SiteSettings();

    if (fbPageId) settings.fbPageId = fbPageId.trim();
    let inputToken = fbPageAccessToken ? fbPageAccessToken.trim() : settings.fbPageAccessToken;
    
    // Auto-extract access_token if user pasted the entire browser address bar URL
    if (inputToken && inputToken.includes("access_token=")) {
      const match = inputToken.match(/access_token=([^&]+)/);
      if (match) {
        inputToken = decodeURIComponent(match[1]);
      }
    }
    let activeToken = inputToken;

    // Step A: Auto-exchange short-lived token to 60-day Long-Lived User Token using fbAppId & fbAppSecret
    if (settings.fbAppId && settings.fbAppSecret && inputToken) {
      try {
        const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${settings.fbAppId}&client_secret=${settings.fbAppSecret}&fb_exchange_token=${inputToken}`;
        const exRes = await fetch(exchangeUrl);
        const exData = await exRes.json();
        if (exData && exData.access_token) {
          activeToken = exData.access_token;
          console.log('[FB-Config] Upgraded to long-lived user token successfully.');
        }
      } catch (e) {
        console.warn('[FB-Config] Token exchange warning:', e.message);
      }
    }

    // Step B: Get Permanent Never-Expiring Page Token via /me/accounts using the long-lived token
    try {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?access_token=${activeToken}`
      );
      const accountsData = await accountsRes.json();
      if (accountsData && Array.isArray(accountsData.data) && accountsData.data.length > 0) {
        const matchedPage = accountsData.data.find((p) => p.id === settings.fbPageId) || accountsData.data[0];
        if (matchedPage && matchedPage.access_token) {
          settings.fbPageAccessToken = matchedPage.access_token;
          if (matchedPage.id) settings.fbPageId = matchedPage.id;
          pageName = matchedPage.name;
          verified = true;
          console.log(`[FB-Config] Generated Permanent Never-Expiring Page Token for "${pageName}" (${settings.fbPageId})`);
        }
      }
    } catch (e) {
      console.warn('[FB-Config] Accounts lookup failed, checking page directly:', e.message);
    }

    // Step C: Fallback check directly on Page ID
    if (!verified && activeToken) {
      try {
        const verifyRes = await fetch(`https://graph.facebook.com/v20.0/${settings.fbPageId}?fields=id,name&access_token=${activeToken}`);
        const verifyData = await verifyRes.json();
        if (verifyData && verifyData.id) {
          settings.fbPageAccessToken = activeToken;
          pageName = verifyData.name || pageName;
          verified = true;
        }
      } catch (e) {
        console.warn('Facebook token verification test warning:', e.message);
      }
    }

    await settings.save();

    res.json({
      success: true,
      verified,
      pageName,
      fbPageId: settings.fbPageId
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Publish Single Product Directly to Facebook Page
const { publishPhotoToFacebook, startAutoPilot, stopAutoPilot, getAutoPilotStatus } = require('../services/fbPromotionService');

router.post('/publish-single', async (req, res) => {
  try {
    const { productId, customCaption, theme } = req.body;
    const settings = await SiteSettings.findOne().lean();

    const pageId = settings?.fbPageId || '61593176967507';
    const pageAccessToken = settings?.fbPageAccessToken;

    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Page Access Token not configured. Please save your Page Token in Settings.'
      });
    }

    const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let bannerBuffer = null;
    try {
      const { regenerateBannerForProduct } = require('../services/dynamicBannerService');
      const bRes = await regenerateBannerForProduct(product._id);
      bannerBuffer = bRes.buffer;
    } catch (e) {
      bannerBuffer = await generateProductBanner(product, theme);
    }
    const caption = customCaption || generateFBCaption(product, product.brand?.name || 'LIORA');

    const fbResult = await publishPhotoToFacebook({
      imageBuffer: bannerBuffer,
      caption,
      pageId,
      pageAccessToken
    });

    res.json({
      success: true,
      fbResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Auto-Pilot Start / Stop / Status
router.post('/start-autopilot', async (req, res) => {
  try {
    const { brandId, brandName, intervalMinutes = 15, limit = 50 } = req.body;
    const settings = await SiteSettings.findOne().lean();

    const pageId = settings?.fbPageId || '61593176967507';
    const pageAccessToken = settings?.fbPageAccessToken;

    if (!pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Page Access Token not configured. Please save your Page Token first.'
      });
    }

    const result = await startAutoPilot({
      brandQuery: brandId || brandName,
      intervalMinutes: Number(intervalMinutes) || 15,
      limit: Number(limit) || 50,
      pageId,
      pageAccessToken
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/stop-autopilot', (req, res) => {
  const result = stopAutoPilot();
  res.json(result);
});

router.get('/autopilot-status', (req, res) => {
  const status = getAutoPilotStatus();
  res.json({ success: true, status });
});

module.exports = router;

