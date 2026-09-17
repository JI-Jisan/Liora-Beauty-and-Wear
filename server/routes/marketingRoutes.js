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

    const enriched = brands.map(b => ({
      _id: b._id,
      name: b.name,
      slug: b.slug,
      productCount: countMap[b._id.toString()] || 0
    })).filter(b => b.productCount > 0);

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

    const query = {
      $or: [
        { brand: brandId },
        { brand: new mongoose.Types.ObjectId(brandId) }
      ]
    };

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .limit(100)
      .lean();

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
    const bannerBuffer = await generateProductBanner(product, theme);

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

    const bannerBuffer = await generateProductBanner(product, theme);
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

