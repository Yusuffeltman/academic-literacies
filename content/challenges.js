// content/challenges.js
export const CHALLENGES = [
  {
    id: 'chall-01',
    title: 'Advanced Syntactic Analysis',
    description: 'A challenge for students who have mastered foundational sentence structures. This will test your ability to deconstruct and rewrite complex academic sentences.',
    unlocks: ['u5', 'u6'], // Unlocks Unit 5 and 6
    eligibility: (state) => {
      // Eligible if they have at least 10 bonus marks from Extensive Reading
      return (state.erProgress?.extraMarks || 0) >= 10;
    },
    prompt: 'The following sentence is grammatically correct but stylistically weak. Rewrite it to be more concise, active, and academic: "It is the belief of the researchers that the phenomenon of cellular degradation is a process that is influenced by a multiplicity of environmental factors."',
    // A simple way to check the answer for now
    solutionKeywords: ['researchers believe', 'environmental factors', 'influence', 'degradation']
  }
];
