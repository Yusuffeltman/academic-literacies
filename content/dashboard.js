// content/dashboard.js
export const DASHBOARD_CONTENT = {
  announcements: [
    {
      id: 1,
      icon: '📢',
      title: 'Welcome to the Academic Literacies Module!',
      content: 'This is your central hub for the course. Make sure to check back here regularly for announcements and reminders about assessments.'
    },
    {
      id: 2,
      icon: '💡',
      title: 'Tip: Use the AI Tutor',
      content: 'The AI Tutor in the bottom right corner is your personal study guide. Use it to clarify concepts, ask questions, and get help with your reading tasks.'
    }
  ],
  reminders: [
    {
      id: 1,
      icon: '🗓️',
      title: 'Assessment 1 Due',
      content: 'Your first major assessment is due at the end of Unit 3. Make sure you have completed all the reading and writing tasks before then.'
    },
    {
      id: 2,
      icon: '✍️',
      title: 'Complete Your Annotations',
      content: 'Remember to use the active reading annotation tools. Your lecturer can see these and will use them to guide you in tutorials.'
    }
  ],
  information: {
    title: 'Module Information',
    items: [
      {
        label: 'Course Coordinator',
        value: 'Dr. Jane Smith'
      },
      {
        label: 'Contact Email',
        value: 'jsmith@university.ac'
      },
      {
        label: 'Consultation Hours',
        value: 'Tuesdays, 10:00 - 12:00'
      }
    ]
  }
};
