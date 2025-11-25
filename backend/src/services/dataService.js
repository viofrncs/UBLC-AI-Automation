// Mock data service - no Google Sheets dependency
require('dotenv').config();

// Mock book data
const mockBooks = [
  {
    bookId: "B001",
    title: "Programming in C",
    author: "Dennis Ritchie",
    copies_available: 5,
    location: "2nd Floor - Section A",
    category: "Programming"
  },
  {
    bookId: "B002",
    title: "Data Structures and Algorithms",
    author: "Robert Sedgewick",
    copies_available: 3,
    location: "2nd Floor - Section A",
    category: "Computer Science"
  },
  {
    bookId: "B003",
    title: "Introduction to Database Systems",
    author: "C.J. Date",
    copies_available: 4,
    location: "2nd Floor - Section B",
    category: "Database"
  },
  {
    bookId: "B004",
    title: "Computer Networks",
    author: "Andrew Tanenbaum",
    copies_available: 5,
    location: "2nd Floor - Section B",
    category: "Networking"
  },
  {
    bookId: "B005",
    title: "Artificial Intelligence",
    author: "Stuart Russell",
    copies_available: 7,
    location: "3rd Floor - Section C",
    category: "AI/ML"
  }
];

// Mock reservations storage
let mockReservations = [];

// Read all books
async function readBooks() {
  console.log('📚 Using mock book data');
  return mockBooks;
}

// Search books by query
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

// Get book by ID
async function getBookById(bookId) {
  const books = await readBooks();
  return books.find(book => book.bookId === bookId);
}

// Decrement book copy count
async function decrementCopy(bookId) {
  const book = mockBooks.find(b => b.bookId === bookId);
  if (book && book.copies_available > 0) {
    book.copies_available--;
    console.log(`✅ Mock: Decremented ${bookId} to ${book.copies_available} copies`);
    return true;
  }
  console.log(`❌ Mock: No copies available for ${bookId}`);
  return false;
}

// Log reservation
async function logReservation(reservationData) {
  mockReservations.push({
    ...reservationData,
    timestamp: new Date().toISOString()
  });
  console.log(`✅ Mock: Reservation logged for ${reservationData.studentEmail}`);
  console.log(`   Reservation ID: ${reservationData.reservationId}`);
  console.log(`   Book: ${reservationData.title}`);
  return true;
}

// Get all reservations (for testing)
async function getReservations() {
  return mockReservations;
}

// Mock write function
async function writeBooks(books) {
  console.log('✅ Mock: Books data would be saved');
  return true;
}

module.exports = {
  readBooks,
  writeBooks,
  findBooksByQuery,
  getBookById,
  decrementCopy,
  logReservation,
  getReservations
};