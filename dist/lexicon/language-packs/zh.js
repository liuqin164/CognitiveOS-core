export const ZH_ENTITY_TYPE_TERMS = {
    device: ['耳机', '键盘', '鼠标', '显示器'],
    project: ['项目'],
    person: ['我', '用户', '他', '她'],
    brand: ['品牌', '框架', '库'],
    issue: ['问题', '故障', '异常']
};
export const ZH_RELATION_PHRASES = {
    owns: ['我有一个', '我有个'],
    purchased: ['买了一个', '又买了一个', '新买的', '重新买了', '第二个'],
    has_issue: ['有问题', '什么问题', '故障', '异常', '坏了', '断连', '杂音', '卡顿', '延迟', '闪屏'],
    worked_on: ['做过', '负责过', '参与过'],
    likes: ['喜欢'],
    dislikes: ['讨厌', '不喜欢']
};
export const ZH_REFERENCE_SIGNALS = {
    newInstance: ['新买的', '新的那个', '第二个', '刚入手一个', '又买了一个'],
    updateInstance: ['那个耳机', '那个设备', '那个项目', '前一个', '之前那个', '它后来', '旧的'],
    ambiguous: ['它', '这个', '那个东西', '那个设备'],
    latest: ['新的那个', '新的设备', '新买的设备', '这个设备', '那个设备', '这个项目', '那个项目', '新项目', '新的项目', '它', '新买的耳机', '这个耳机', '那个耳机'],
    previous: ['之前那个', '前一个', '前一个设备', '旧设备', '前一个项目', '旧项目', '上一个项目', '前一个耳机', '旧耳机']
};
export const ZH_SHORT_REPLY_BINDING = {
    approved: ['好的', '好', '行', '可以', '继续'],
    rejected: ['不要', '不行', '算了', '先别这个', '先别'],
    entitySelection: ['旧的那个', '就这个', '还是它']
};
export const ZH_PENDING_PATTERNS = {
    action: [/要不要/i, /是否/i, /是否需要/i, /要我帮你/i],
    entity: [/哪个/i, /哪一个/i, /还是/i]
};
export const ZH_LONG_TERM_SIGNAL_TERMS = ['项目', '喜欢', '讨厌', '决定', '必须', '不能', '买了', '修好了', '送人了', '在用'];
export const ZH_ISSUE_KEYWORDS = {
    connectivity: ['断连', '掉线', '配对失败'],
    sound: ['杂音', '爆音', '无声', '收音发闷', '电流声'],
    performance: ['卡顿', '延迟', '慢', '不稳定', '闪屏']
};
export const ZH_ISSUE_QUALIFIERS = {
    left: ['左耳'],
    right: ['右耳']
};
