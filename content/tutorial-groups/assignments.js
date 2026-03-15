// content/tutorial-groups/assignments.js
// Add your real tutor-group allocations here.
// Match tutors by email (recommended) and/or displayName.
// For stronger privacy and security, prefer studentUids over student emails.

export const TUTOR_GROUP_ASSIGNMENTS = [
  {
    tutor: {
      email: 'tutor1@university.ac.za',
      displayName: 'Tutor One',
    },
    groups: [
      {
        id: 'TG1',
        name: 'Tutorial Group 1',
        studentUids: [
          'student_uid_1',
          'student_uid_2',
        ],
      },
      {
        id: 'TG2',
        name: 'Tutorial Group 2',
        // Fallback (less secure): email-based matching
        students: [
          'student3@university.ac.za',
        ],
      },
    ],
  },
];
