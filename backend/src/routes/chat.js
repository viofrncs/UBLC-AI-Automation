// ... inside your router.post('/', async (req, res) => { ...

// Check reservation intent
const reservationKeywords = ['reserve', 'borrow', 'check out', 'book me', 'i want to reserve'];
const shouldReserve = reservationKeywords.some(keyword => 
  message.toLowerCase().includes(keyword)
);

// Check if student info is complete
const hasCompleteStudentInfo = student && 
  student.studentId && 
  student.name && 
  student.email && 
  student.email.includes('@');

const responseData = {
  success: true,
  reply: aiReply,
  department: department,
  timestamp: new Date().toISOString(),
  // CRITICAL: Add these for n8n workflow
  reservationIntent: shouldReserve,
  requiresStudentInfo: !hasCompleteStudentInfo,
  // For backward compatibility
  requiresAction: shouldReserve && hasCompleteStudentInfo,
  actionType: shouldReserve ? 'reservation' : 'information'
};

// Add student info if provided
if (student) {
  responseData.student = student;
}

res.json(responseData);