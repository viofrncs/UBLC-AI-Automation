const { google } = require('googleapis');
require('dotenv').config();

// Google Sheets configuration
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const sheets = google.sheets('v4');

// Create auth client
async function getAuthClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    throw new Error('Failed to authenticate with Google Sheets. Check your GOOGLE_SERVICE_ACCOUNT_KEY in .env');
  }
}

// Read all books from Google Sheets
async function readBooks() {
  try {
    const auth = await getAuthClient();
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SHEET_ID,
      range: 'Books!A2:F', // Skip header row, read columns A-F
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      bookId: row[0] || '',
      title: row[1] || '',
      author: row[2] || '',
      copies_available: parseInt(row[3]) || 0,
      location: row[4] || '',
      category: row[5] || ''
    }));
  } catch (error) {
    console.error('Error reading books from Google Sheets:', error.message);
    throw error;
  }
}

// Write books back to Google Sheets
async function writeBooks(books) {
  try {
    const auth = await getAuthClient();
    
    // Convert books array to 2D array for Sheets
    const values = books.map(book => [
      book.bookId,
      book.title,
      book.author,
      book.copies_available,
      book.location,
      book.category
    ]);

    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SHEET_ID,
      range: 'Books!A2:F',
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log('✅ Books updated in Google Sheets');
  } catch (error) {
    console.error('Error writing books to Google Sheets:', error.message);
    throw error;
  }
}

// Search books by query (title, author, bookId, or category)
async function findBooksByQuery(q) {
  if (!q) return [];
  
  const books = await readBooks();
  const searchTerm = q.toLowerCase();
  
  return books.filter(book =>
    (book.title && book.title.toLowerCase().includes(searchTerm)) ||
    (book.author && book.author.toLowerCase().includes(searchTerm)) ||
    (book.bookId && book.bookId.toLowerCase() === searchTerm) ||
    (book.category && book.category.toLowerCase().includes(searchTerm))
  );
}

// Decrement book copy count when reserved
async function decrementCopy(bookId) {
  try {
    const books = await readBooks();
    const bookIndex = books.findIndex(b => b.bookId === bookId);
    
    if (bookIndex === -1) {
      throw new Error(`Book not found: ${bookId}`);
    }
    
    if (books[bookIndex].copies_available <= 0) {
      console.log(`❌ No copies available for ${bookId}`);
      return false; // No copies available
    }
    
    // Decrement the copy count
    books[bookIndex].copies_available -= 1;
    
    // Write back to Google Sheets
    await writeBooks(books);
    
    console.log(`✅ Decremented copy for ${bookId}. New count: ${books[bookIndex].copies_available}`);
    return true;
  } catch (error) {
    console.error('Error decrementing copy:', error.message);
    throw error;
  }
}

// Log reservation to Google Sheets (Reservations tab)
async function logReservation(reservationData) {
  try {
    const auth = await getAuthClient();
    
    const timestamp = new Date().toLocaleString('en-PH', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const values = [[
      reservationData.reservationId,
      reservationData.bookId,
      reservationData.title || 'N/A',
      reservationData.studentName,
      reservationData.studentEmail,
      timestamp,
      'Active'
    ]];

    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SHEET_ID,
      range: 'Reservations!A:G',
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log('✅ Reservation logged to Google Sheets');
    return true;
  } catch (error) {
    console.error('Error logging reservation:', error.message);
    // Don't throw - logging failure shouldn't break the reservation
    return false;
  }
}

module.exports = {
  readBooks,
  writeBooks,
  findBooksByQuery,
  decrementCopy,
  logReservation
};