'use strict';

const express = require('express');
const multer = require('multer');
const extractPdfText = require('../utils/extractPdfText');

const router = express.Router();

// Memory storage keeps the file buffer in memory
const upload = multer({ storage: multer.memoryStorage() });

router.post('/extract', upload.single('resumeFile'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded or file buffer missing' });
    }

    const result = await extractPdfText(req.file.buffer);

    console.log(`[Resume Extract] Method: ${result.method}, Confidence: ${result.confidence}`);

    return res.json(result);
  } catch (err) {
    console.error('[Resume Extract] Error:', err.message);
    next(err);
  }
});

module.exports = router;
