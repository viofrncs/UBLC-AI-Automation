const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const dataService = require('../services/dataService');
const emailService = require('../services/emailService');
const zapierService = require('../services/zapierService');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define AI tools/functions that the model can use
const tools = [
  {
    type: "function",
    function: {
      name: "search_books",
      description: "Search for books in the library by title, author, or category. Returns matching books with availability.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (book title, author name, or category)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_all_books",
      description: "Get the complete list of all books in the library with their availability status.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_book_details",
      description: "Get detailed information about a specific book by its ID or title.",
      parameters: {
        type: "object",
        properties: {
          identifier: {
            type: "string",
            description: "Book ID (e.g., B001) or book title"
          }
        },
        required: ["identifier"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reserve_book",
      description: "Reserve a book for a student. Only call this when the student explicitly wants to reserve a book and you have confirmed which book they want.",
      parameters: {
        type: "object",
        properties: {
          bookId: {
            type: "string",
            description: "The book ID (e.g., B001)"
          },
          bookTitle: {
            type: "string",
            description: "The title of the book being reserved"
          }
        },
        required: ["bookId", "bookTitle"]
      }
    }
  }
];

// Function implementations
async function executeFunction(functionName, args) {
  switch (functionName) {
    case "search_books":
      return await dataService.findBooksByQuery(args.query);
    
    case "get_all_books":
      return await dataService.readBooks();
    
    case "get_book_details":
      const books = await dataService.readBooks();
      const book = books.find(b => 
        b.bookId.toLowerCase() === args.identifier.toLowerCase() ||
        b.title.toLowerCase().includes(args.identifier.toLowerCase())
      );
      return book || { error: "Book not found" };
    
    case "reserve_book":
      return { 
        action: "reserve",
        bookId: args.bookId,
        bookTitle: args.bookTitle
      };
    
    default:
      return { error: "Unknown function" };
  }
}

router.post('/', async (req, res) => {
  try {
    const { message, student, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build conversation with AI
    const messages = [
      { 
        role: "system", 
        content: `You are an intelligent library assistant for UBLC (University of Batangas Lipa Campus). 

Your capabilities:
- Search and recommend books based on student needs
- Check availability and provide book details
- Help students reserve books

Guidelines:
- Be friendly, helpful, and conversational
- When students ask about books, use your tools to search
- When showing multiple books, format them nicely with bullet points
- When a student wants to reserve, confirm which book first, then use the reserve_book function
- Always mention how many copies are available
- Provide helpful suggestions based on their interests

Use your tools intelligently to provide accurate, real-time information.`
      }
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-6)); // Keep last 6 messages for context
    }

    // Add current message
    messages.push({ role: "user", content: message });

    let response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto", // Let AI decide when to use tools
      temperature: 0.7,
      max_tokens: 1500
    });

    let assistantMessage = response.choices[0].message;
    
    // Handle tool calls (AI wants to use functions)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage); // Add AI's response with tool calls
      
      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`🤖 AI is calling function: ${functionName}`, functionArgs);
        
        const functionResult = await executeFunction(functionName, functionArgs);
        
        // Add function result back to conversation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        });
      }
      
      // Get AI's response after seeing function results
      response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1500
      });
      
      assistantMessage = response.choices[0].message;
    }

    const aiReply = assistantMessage.content;

    // Check if AI wants to reserve a book
    const lastToolCall = messages
      .filter(m => m.role === "tool")
      .map(m => JSON.parse(m.content))
      .reverse()
      .find(result => result.action === "reserve");

    if (lastToolCall) {
      // AI decided to reserve a book
      if (!student || !student.email) {
        return res.json({ 
          reply: `To complete your reservation for "${lastToolCall.bookTitle}", I'll need your name and email address. Please provide them.` 
        });
      }

      // Execute the reservation
      const books = await dataService.readBooks();
      const book = books.find(b => b.bookId === lastToolCall.bookId);

      if (!book || book.copies_available <= 0) {
        return res.json({ 
          reply: `I apologize, but "${lastToolCall.bookTitle}" is no longer available. Would you like me to suggest similar books?` 
        });
      }

      // Decrement book count
      const success = await dataService.decrementCopy(lastToolCall.bookId);
      if (!success) {
        return res.json({ 
          reply: `Sorry, "${lastToolCall.bookTitle}" was just reserved by someone else. Please choose another book.` 
        });
      }

      const reservationId = `RSV-${Date.now()}`;

      // Log reservation
      await dataService.logReservation({
        reservationId,
        bookId: lastToolCall.bookId,
        title: book.title,
        studentName: student.name || 'Student',
        studentEmail: student.email
      });

      // Send to Zapier
      await zapierService.sendToZapier({
        reservationId,
        bookId: lastToolCall.bookId,
        title: book.title,
        author: book.author,
        location: book.location,
        studentName: student.name || 'Student',
        studentEmail: student.email
      });

      // Send email
      try {
        await emailService.sendReservationEmail(student.email, {
          reservationId,
          bookId: lastToolCall.bookId,
          title: book.title,
          author: book.author,
          location: book.location,
          studentName: student.name || 'Student'
        });

        return res.json({ 
          reply: `🎉 Perfect! I've successfully reserved "${book.title}" for you!\n\n📋 Reservation ID: ${reservationId}\n📧 Confirmation email sent to: ${student.email}\n📍 Pickup location: ${book.location}\n⏰ Please pick up within 3 days\n\nIs there anything else I can help you with?` 
        });
      } catch (emailErr) {
        console.warn('Email failed:', emailErr);
        return res.json({ 
          reply: `✅ "${book.title}" has been reserved! (ID: ${reservationId})\n\nHowever, the confirmation email failed to send. Please note your reservation ID and pick up at ${book.location} within 3 days.` 
        });
      }
    }

    // Regular conversational response
    res.json({ reply: aiReply });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;