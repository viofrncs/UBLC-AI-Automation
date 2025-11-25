const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const emailService = require('../services/emailService');
// Remove zapierService import since we're using n8n

router.post('/', async (req, res) => {
  try {
    const { bookId, title, studentName, studentEmail } = req.body;

    if (!bookId || !studentEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'bookId and studentEmail are required' 
      });
    }

    const books = await dataService.readBooks();
    const book = books.find(b => b.bookId === bookId);
    
    if (!book) {
      return res.status(404).json({ 
        success: false,
        error: 'Book not found' 
      });
    }

    // Check availability
    if (book.copies_available <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No copies available' 
      });
    }

    const reservationId = `RES-${Date.now()}`;

    // Create reservation
    const reservation = {
      reservationId,
      bookId,
      title: book.title,
      studentName: studentName || 'Student',
      studentEmail,
      timestamp: new Date().toISOString(),
      status: 'reserved'
    };

    // Log reservation (in real system, save to Google Sheets)
    await dataService.logReservation(reservation);

    // Decrement available copies
    await dataService.decrementCopy(bookId);

    // Send email confirmation
    let emailStatus = 'sent';
    try {
      await emailService.sendReservationEmail(studentEmail, {
        reservationId,
        bookTitle: book.title,
        author: book.author,
        location: book.location,
        studentName: studentName || 'Student',
        pickupDeadline: '3 days'
      });
    } catch (emailErr) {
      console.warn('Failed to send email:', emailErr);
      emailStatus = 'failed';
    }

    // For n8n integration - you can add webhook call here later
    console.log('Reservation created for n8n workflow:', reservation);

    res.json({
      success: true,
      reservationId,
      message: `Successfully reserved "${book.title}"`,
      details: {
        bookId,
        bookTitle: book.title,
        author: book.author,
        location: book.location,
        studentName: studentName || 'Student',
        studentEmail,
        reservationDate: new Date().toISOString(),
        emailStatus,
        pickupNote: 'Please pick up within 3 days at the library front desk'
      }
    });

  } catch (err) {
    console.error('POST /api/reserve error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: err.message 
    });
  }
});

// GET /api/reserve - Get reservation info
router.get('/', async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'UBLC Library Reservation System',
      instructions: 'Send POST request with bookId, studentName, and studentEmail',
      example: {
        method: 'POST',
        url: '/api/reserve',
        body: {
          bookId: 'B001',
          studentName: 'John Doe',
          studentEmail: 'john@ublc.edu.ph'
        }
      },
      note: 'Integrated with n8n workflow automation'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET /api/reserve/:id - Get specific reservation (mock)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      reservationId: id,
      status: 'reserved',
      message: 'Reservation details would be fetched from database'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

module.exports = router;