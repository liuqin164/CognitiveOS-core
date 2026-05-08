export const shortReplySamplesEn = {
  priorityFlow: {
    questionPrompt: 'Do we still need more investigation this week?',
    actionPrompt: 'Do you want me to archive project A first?',
    entityPrompt: 'Do you mean the previous keyboard or the new one?',
    entityReply: 'the new one',
    actionReply: 'never mind',
    questionReply: 'sounds good'
  },
  entitySelectionOverNegation: {
    actionPrompt: 'Should I delete the old config?',
    entityPrompt: 'Do we keep the previous monitor or the new one?',
    reply: 'no, the previous one'
  },
  latestCompatibleBinding: {
    questionPrompt: 'Should we continue the payment rollout?',
    keepGoingReply: 'go on',
    actionPrompt: 'Should I delete the previous config?',
    cancelReply: 'forget it',
    entityPrompt: 'Do you mean the previous headset or the new one?',
    selectReply: 'this one, the new one'
  }
} as const;
