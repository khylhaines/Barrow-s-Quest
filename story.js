// story.js
// Storyline / Progression overlay (does NOT replace your existing game loop)

export const STORY = {
  id: "barrow_inferno_main",
  title: "Barrow Inferno: Main Quest",
  phases: [
    {
      id: "phase1",
      title: "Phase 1 — The First Three",
      intro:
        "Welcome to Barrow Inferno. Your first link must be forged through Park, Abbey, and the Docks Museum.",
      steps: [
        {
          id: "p1_step1",
          title: "Park Initiation",
          type: "capture_pin",
          pinId: 5, // Park Bandstand (change if you prefer a different Park pin)
          reward: { coins: 150, chest: "bronze" },
          hint: "Head into Barrow Park. Find the Bandstand and capture the node.",
        },
        {
          id: "p1_step2",
          title: "Abbey Echo",
          type: "capture_pin",
          pinId: 12, // Furness Abbey
          reward: { coins: 200, chest: "bronze" },
          hint: "Travel north-east to Furness Abbey. Capture and listen for history.",
        },
        {
          id: "p1_step3",
          title: "Dock Museum Link",
          type: "capture_pin",
          pinId: 13, // Dock Museum Anchor
          reward: { coins: 250, chest: "silver" },
          hint: "Go to the Dock Museum Anchor. Capture it to lock the Phase 1 link.",
        },
      ],
      completionReward: {
        coins: 500,
        chest: "silver",
        unlockPhase: "phase2",
      },
    },

    {
      id: "phase2",
      title: "Phase 2 — Deepen the Link",
      intro:
        "Now deepen the three anchors. Extra tasks appear nearby, with hidden chests.",
      steps: [
        {
          id: "p2_step1",
          title: "Park Mastery",
          type: "multi_mode_at_pin",
          pinId: 5,
          meta: { modes: ["quiz", "history", "activity"] },
          reward: { coins: 250, chest: "silver" },
          hint: "At the Park Bandstand: complete Quiz + History + Activity.",
        },
        {
          id: "p2_step2",
          title: "Abbey Trial",
          type: "multi_mode_at_pin",
          pinId: 12,
          meta: { modes: ["history", "logic"] },
          reward: { coins: 300, chest: "silver" },
          hint: "At the Abbey: complete History + Logic.",
        },
        {
          id: "p2_step3",
          title: "Museum Proof",
          type: "multi_mode_at_pin",
          pinId: 13,
          meta: { modes: ["quiz", "battle"] },
          reward: { coins: 350, chest: "gold" },
          hint: "At the Dock Museum: complete Quiz + Battle.",
        },
      ],
      completionReward: {
        coins: 800,
        chest: "gold",
      },
    },
  ],
};

// ---------------------------
// Engine helpers
// ---------------------------

export function getStoryState(rootState) {
  rootState.story = rootState.story || {};
  const s = rootState.story;
  s.activeStoryId = s.activeStoryId || STORY.id;
  s.doneSteps = s.doneSteps || []; // array of step ids
  s.donePhases = s.donePhases || []; // array of phase ids
  s.lastToast = s.lastToast || 0;
  return s;
}

export function isStepDone(rootState, stepId) {
  const s = getStoryState(rootState);
  return s.doneSteps.includes(stepId);
}

export function markStepDone(rootState, stepId) {
  const s = getStoryState(rootState);
  if (!s.doneSteps.includes(stepId)) s.doneSteps.push(stepId);
}

export function markPhaseDone(rootState, phaseId) {
  const s = getStoryState(rootState);
  if (!s.donePhases.includes(phaseId)) s.donePhases.push(phaseId);
}

export function getActiveStep(rootState) {
  const s = getStoryState(rootState);

  // Find first phase not complete
  for (const phase of STORY.phases) {
    if (s.donePhases.includes(phase.id)) continue;

    // Find first step not complete
    for (const step of phase.steps) {
      if (!s.doneSteps.includes(step.id)) {
        return { phase, step };
      }
    }

    // If we got here: phase steps all done, but phase not marked complete yet
    return { phase, step: null, phaseReadyToComplete: true };
  }

  // All complete
  return { phase: null, step: null, done: true };
}
