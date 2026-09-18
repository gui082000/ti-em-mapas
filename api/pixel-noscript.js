module.exports = (req, res) => {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!id) {
    res.status(404).end();
    return;
  }
  res.writeHead(302, {
    Location: `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`,
  });
  res.end();
};
