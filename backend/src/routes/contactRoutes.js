'use strict';

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact
router.post('/', contactController.submitContactForm);

module.exports = router;
