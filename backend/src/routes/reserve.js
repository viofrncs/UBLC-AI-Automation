const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const emailService = require('../services/emailService');
const zapierService = require('../services/zapierService');

router.post('/', async (req, res) => {
  try {
    const { bookId, student } = req.body;

    if (!bookId || !student || !student.email) {
      return res.status(400).json({ 
        error: 'bookId and student with email are required' 
      });
    }

    const books = await dataService.readBooks();
    const book = books.find(b => b.bookId === bookId);
    
    if (!book) {
      return res.status(404).json({ 
        status: 'failed', 
        message: 'Book not found' 
      });
    }

    const ok = await dataService.decrementCopy(bookId);
    if (!ok) {
      return res.status(400).json({ 
        status: 'failed', 
        message: 'No copies available' 
      });
    }

    const reservationId = `RSV-${Date.now()}`;

    await dataService.logReservation({
      reservationId,
      bookId,
      title: book.title,
      studentName: student.name || 'Student',
      studentEmail: student.email
    });

    await zapierService.sendToZapier({
      reservationId,
      bookId,
      title: book.title,
      author: book.author,
      location: book.location,
      studentName: student.name || 'Student',
      studentEmail: student.email
    });

    const emailData = {
      reservationId,
      bookId,
      title: book.title,
      author: book.author,
      location: book.location,
      studentName: student.name || 'Student',
    };

    let emailStatus = 'sent';
    try {
      await emailService.sendReservationEmail(student.email, emailData);
    } catch (emailErr) {
      console.warn('Failed to send email:', emailErr);
      emailStatus = 'failed';
    }

    res.json({
      status: 'success',
      reservationId,
      bookTitle: book.title,
      message: emailStatus === 'sent'
        ? 'Reserved successfully — confirmation email sent.'
        : 'Reserved successfully — confirmation email failed.'
    });

  } catch (err) {
    console.error('POST /api/reserve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    res.json({ 
      message: 'Check Google Sheets Reservations tab for all reservations',
      sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit#gid=1`
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;