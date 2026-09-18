module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    basico: process.env.NEXT_PUBLIC_CHECKOUT_URL_BASICO || null,
    premium: process.env.NEXT_PUBLIC_CHECKOUT_URL_PREMIUM || null,
    premiumDownsell: process.env.NEXT_PUBLIC_CHECKOUT_URL_PREMIUM_DOWNSELL || null,
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || null,
  });
};
