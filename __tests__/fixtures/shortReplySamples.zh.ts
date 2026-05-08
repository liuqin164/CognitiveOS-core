export const shortReplySamplesZh = {
  priorityFlow: {
    questionPrompt: '这周还要继续排查吗？',
    actionPrompt: '要不要先归档项目 A？',
    entityPrompt: '你说的是前一个键盘还是新的那个键盘？',
    entityReply: '新的那个',
    actionReply: '算了，先别这个',
    questionReply: '好的'
  },
  entitySelectionOverNegation: {
    actionPrompt: '要不要删除旧配置？',
    entityPrompt: '要保留前一个显示器还是新的那个显示器？',
    reply: '不要，还是前一个'
  },
  latestCompatibleBinding: {
    questionPrompt: '还要继续支付发布吗？',
    keepGoingReply: '继续',
    actionPrompt: '要不要删除前一个配置？',
    cancelReply: '算了',
    entityPrompt: '你说的是前一个耳机还是新的那个耳机？',
    selectReply: '就这个，新的那个'
  }
} as const;

